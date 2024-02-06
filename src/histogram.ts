/**
 * Creates a histogram based on a column of measures.
 * https://www.highcharts.com/docs/chart-and-series-types/histogram-series
 */
import _ from "lodash";

import Highcharts from "highcharts/es-modules/masters/highcharts.src";
import "highcharts/es-modules/masters/modules/histogram-bellcurve.src";

import {TableChartModel} from "./TableChartModel.ts";

import {
    ChartColumn,
    ChartConfig, ChartConfigEditorDefinition,
    ChartModel,
    ChartToTSEvent,
    CustomChartContext,
    DataType,
    getChartContext,
    Query, ValidationResponse, VisualPropEditorDefinition
} from "@thoughtspot/ts-chart-sdk";

// Declare the numeric types for quick checking.
const numericTypes = [DataType.INT32, DataType.INT64, DataType.FLOAT];

const logmsg = (msg: string, data: any = "") => {
    console.log(`Histogram: ${msg}`, data);
}

/**
 * Returns the default chart config for the histogram chart type.
 * @param chartModel A chart model (https://ts-chart-sdk-docs.vercel.app/interfaces/ChartModel.html)
 * @return An array of chart configs (https://ts-chart-sdk-docs.vercel.app/interfaces/ChartConfig.html)
 */
const getDefaultChartConfig = (chartModel: ChartModel): ChartConfig[] => {
    logmsg("getting default chart config");

    const tableModel = new TableChartModel(chartModel);

    // Make sure there is at least one column and it has to be a number.
    if (tableModel.length < 1) {
        return [];
    }

    const column_key = 'measure';
    let configColumns: ChartColumn[];

    const dataColumns = tableModel.getColumnsWithDataTypes(numericTypes);
    configColumns = [tableModel.getChartColumn(dataColumns[0].columnId)]; // just using one.

    // For a histogram, there aren't any dimensions to worry about.
    const defaultChartConfig: ChartConfig = {
        key: 'default', // this is returning a default configuration.
        dimensions: [
            {
                key: column_key,
                columns: configColumns
            }
        ]
    }

    return [defaultChartConfig];
}

const getChartConfigEditorDefinition = (): ChartConfigEditorDefinition[] => {
    return [
        {
            key: 'column',
            label: 'Custom Column',
            descriptionText: 'must provide one attribute and one measure',
            columnSections: [
                {
                    key: 'x',
                    label: 'Custom X Axis',
                    allowAttributeColumns: true,
                    allowMeasureColumns: false,
                    allowTimeSeriesColumns: true,
                    maxColumnCount: 1,
                },
                {
                    key: 'y',
                    label: 'Custom Y Axis',
                    allowAttributeColumns: false,
                    allowMeasureColumns: true,
                    allowTimeSeriesColumns: false,
                    maxColumnCount: 1,
                },
            ]
        }
    ]
}

const getVisualPropEditorDefinition = (): VisualPropEditorDefinition => {
    return {
        elements: [
            {
                key: 'color',
                type: 'colorpicker',
                defaultValue: 'green',
                label: 'Color',
                selectorType: 'COLOR'
            },
        ],
    }
}

/**
 * This function would appear to get the queries based on the user configuration in the chart.
 * NOTE: In the sample, this isn't actually called.
 * @param chartConfig
 */
const getQueriesFromChartConfig = (
    chartConfig: ChartConfig[]
): Array<Query> => {
    logmsg('chart config: ', chartConfig);
    // map all the columns in the config to the query array
    let queries = chartConfig.map(
        (config: ChartConfig): Query =>
            _.reduce(
                config.dimensions,
                (acc: Query, dimension) => ({
                    queryColumns: [
                        ...acc.queryColumns,
                        ...dimension.columns,
                    ],
                }),
                {
                    queryColumns: [],
                } as Query,
            ),
    );

    logmsg('queries: ', queries);

    return queries;
}

/**
 * The chart can only have a measure (numeric) on the Y axis and attribute (non-numeric) on the X axis.
 * @param updatedConfig The config from ThoughtSpot.
 * @param chartModel The chart model from ThoughtSpot.
 */
const getValidateConfig = (updatedConfig: ChartConfig[], chartModel: ChartModel): ValidationResponse => {
    // TODO - abstract the config to make it easier to work with.

    logmsg('validating the chart config');
    logmsg('updatedConfig', updatedConfig);
    logmsg('chartModel', chartModel);

    let isOK = true;
    let errorMessages: string[] = ["Histograms need two parameters, an attribute on the X axis and measure on the Y axis."];

    try {
        // Find the column entry and not the dimension entry.
        let dimensions = updatedConfig.filter(_ => _.key === 'column')[0].dimensions;

        if (!dimensions) {
            logmsg('invalid due to missing dimensions');
            isOK = false;
        } else if (dimensions.length !== 2) {
            logmsg('invalid due length of dimensions');
            isOK = false;
        } else {  // have two columns, see if they are the right type.
            const xcols = dimensions.filter(col => col.key === 'x');
            logmsg(`ycols with length ${xcols.length}`, xcols);
            const ycols = dimensions.filter(col => col.key === 'y');
            logmsg(`ycols with length ${ycols.length}`, ycols);

            if (xcols.length != 1 || ycols.length != 1) {
                logmsg('invalid due number of columns in each');
                isOK = false;
            } else {
                const xcol = xcols[0].columns.length > 0 ? xcols[0].columns[0] : undefined;
                const ycol = ycols[0].columns.length > 0 ? ycols[0].columns[0] : undefined;
                logmsg(`checking types: x: ${xcol} y: ${ycol} against ${numericTypes}`);
                if ((xcol && numericTypes.includes(xcol.dataType)) ||
                    (ycol && !numericTypes.includes(ycol.dataType))) {
                    logmsg('invalid due to column types');
                    isOK = false;
                }
            }
        }
    } catch (e) {
        isOK = false;
        errorMessages.push("" + e);
    }

    const res = {isValid: isOK, validationErrorMessage: isOK ? [""] : errorMessages};
    console.log(res);
    return res;
}

/**
 * This function does the actual rendering of the chart.  It needs to be called in the context of emitters.
 * See renderChart.
 */
const _renderChart = async (context: CustomChartContext): Promise<void> => {


    logmsg('render chart ================================');
    logmsg('context: ', context);

    // Original code from https://jsfiddle.net/api/post/library/pure/

    /*  Data from example.
    const data = [3.5, 3, 3.2, 3.1, 3.6, 3.9, 3.4, 3.4, 2.9, 3.1, 3.7, 3.4, 3, 3,
        4, 4.4, 3.9, 3.5, 3.8, 3.8, 3.4, 3.7, 3.6, 3.3, 3.4, 3, 3.4, 3.5, 3.4,
        3.2, 3.1, 3.4, 4.1, 4.2, 3.1, 3.2, 3.5, 3.6, 3, 3.4, 3.5, 2.3, 3.2, 3.5,
        3.8, 3, 3.8, 3.2, 3.7, 3.3, 3.2, 3.2, 3.1, 2.3, 2.8, 2.8, 3.3, 2.4, 2.9,
        2.7, 2, 3, 2.2, 2.9, 2.9, 3.1, 3, 2.7, 2.2, 2.5, 3.2, 2.8, 2.5, 2.8, 2.9,
        3, 2.8, 3, 2.9, 2.6, 2.4, 2.4, 2.7, 2.7, 3, 3.4, 3.1, 2.3, 3, 2.5, 2.6,
        3, 2.6, 2.3, 2.7, 3, 2.9, 2.9, 2.5, 2.8, 3.3, 2.7, 3, 2.9, 3, 3, 2.5, 2.9,
        2.5, 3.6, 3.2, 2.7, 3, 2.5, 2.8, 3.2, 3, 3.8, 2.6, 2.2, 3.2, 2.8, 2.8, 2.7,
        3.3, 3.2, 2.8, 3, 2.8, 3, 2.8, 3.8, 2.8, 2.8, 2.6, 3, 3.4, 3.1, 3, 3.1,
        3.1, 3.1, 2.7, 3.2, 3.3, 3, 2.5, 3, 3.4, 3];
     */

    const chartModel = context.getChartModel()!;
    logmsg('Chart model: ', chartModel);
    const tableModel = new TableChartModel(chartModel);
    logmsg('tableModel: ', tableModel);

    // TODO Should this be abstracted more?
    const measureName = chartModel.config.chartConfig![0].dimensions[0].columns[0].name;
    logmsg(`measure name: ${measureName}`);

    let data: number[] = tableModel.getDataForColumnName(measureName);
    logmsg('checking data');
    if (data === undefined) {
        logmsg('setting data to []');
        data = [];  // make empty if no data.
    }
    logmsg('data: ', data);

    Highcharts.chart('container', {
        title: {
            text: 'Highcharts Histogram In ThoughtSpot'
        },

        xAxis: [{
            title: {text: measureName},
            alignTicks: false
        }, {
            title: {text: 'Histogram'},
            alignTicks: false,
            opposite: true
        }],

        yAxis: [{
            title: {text: 'Data'}  // set to be the measure name
        }, {
            title: {text: 'Histogram'},
            opposite: true
        }],

        plotOptions: {
            histogram: {
                accessibility: {
                    point: {
                        valueDescriptionFormat: '{index}. {point.x:.3f} to {point.x2:.3f}, {point.y}.'
                    }
                }
            }
        },

        series: [{
            name: 'Histogram',
            type: 'histogram',
            xAxis: 1,
            yAxis: 1,
            baseSeries: 's1',
            zIndex: -1
        }, {
            name: 'Data',
            type: 'scatter',
            data: data,
            id: 's1',
            marker: {
                radius: 1.5
            }
        }]
    });
}

const renderChart = async (context: CustomChartContext): Promise<void> => {
    try {
        context.emitEvent(ChartToTSEvent.RenderStart);  // tell TS we are starting.
        _renderChart(context);
    } catch (e) {
        // Tell TS there was an error.
        context.emitEvent(ChartToTSEvent.RenderError, {
            hasError: true,
            error: e,
        });
    } finally {
        // Tell TS we are done.
        context.emitEvent(ChartToTSEvent.RenderComplete);
    }
}


const init = async () => {
    logmsg("init called");

    // Standard init with required properties.
    const ctx = await getChartContext({
        getDefaultChartConfig: getDefaultChartConfig,
        validateConfig: getValidateConfig,
        getQueriesFromChartConfig: getQueriesFromChartConfig,
        renderChart: renderChart,
        chartConfigEditorDefinition: getChartConfigEditorDefinition(),
        visualPropEditorDefinition: getVisualPropEditorDefinition(),
    });
    logmsg('rendering');
    renderChart(ctx);
};

init();