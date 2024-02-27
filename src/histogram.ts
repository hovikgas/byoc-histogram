/**
 * Creates a histogram based on a column of measures.
 * https://www.highcharts.com/docs/chart-and-series-types/histogram-series
 */
import _ from "lodash";

import Highcharts from "highcharts/es-modules/masters/highcharts.src";
import "highcharts/es-modules/masters/modules/histogram-bellcurve.src";

import {TableChartModel} from "./TableChartModel.ts";

import {
    // TODO ChartColumn,
    ChartConfig, ChartConfigEditorDefinition,
    ChartModel,
    ChartToTSEvent,
    CustomChartContext,
    // TODO DataType,
    getChartContext,
    Query, ValidationResponse, VisualPropEditorDefinition
} from "@thoughtspot/ts-chart-sdk";
import {TSChartConfigList} from "./TSChartConfig.ts";

// Declare the numeric types for quick checking.
// TODO const numericTypes = [DataType.INT32, DataType.INT64, DataType.FLOAT];

const defaultColor = 'green'; // default chart color.

const logMessage = (msg: string, data: any = "") => {
    console.log(`Histogram: ${msg}`, data);
}

/**
 * Returns the default chart config for the histogram chart type.
 * @param chartModel A chart model (https://ts-chart-sdk-docs.vercel.app/interfaces/ChartModel.html)
 * @return An array of chart configs (https://ts-chart-sdk-docs.vercel.app/interfaces/ChartConfig.html)
 */
const getDefaultChartConfig = (chartModel: ChartModel): ChartConfig[] => {
    logMessage("getting default chart config");

    const tableModel = new TableChartModel(chartModel);

    // Make sure there is at least one Y column, and it is a number.
    if (tableModel.allColumns.length < 1) {
        return [];
    }

    const column_key = 'measure';

    // For a histogram, there aren't any dimensions to worry about.
    const defaultChartConfig: ChartConfig = {
        key: 'default', // this is returning a default configuration.
        dimensions: [
            {
                key: column_key,
                columns: [] // tableModel.getYColumnNames()[0] // TODO - Not sure this is correct.
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
                defaultValue: defaultColor,
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
    logMessage('chart config: ', chartConfig);
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

    logMessage('queries: ', queries);

    return queries;
}

/**
 * The chart can only have a measure (numeric) on the Y axis and attribute (non-numeric) on the X axis.
 * @param updatedConfig The config from ThoughtSpot.
 * @param chartModel The chart model from ThoughtSpot.
 */
const getValidateConfig = (updatedConfig: ChartConfig[], chartModel: ChartModel): ValidationResponse => {
    // TODO - abstract the config to make it easier to work with.

    logMessage('validating the chart config ==========================');
    logMessage('updatedConfig', updatedConfig);
    logMessage('chartModel', chartModel);

    const chartConfigList = new TSChartConfigList(updatedConfig);
    console.log('chartConfigList: ', chartConfigList);

    let isOK = true;
    let errorMessages: string[] = ["Histograms need two parameters, an attribute on the X axis and measure on the Y axis."];

    /*  TODO - disabling for now so I can get all the configs.  Re-enable for this chart later.
    try {
        // Find the column entry and not the dimension entry.
        // let dimensions = updatedConfig.filter(_ => _.key === 'column')[0].dimensions;
        let columnConfig = chartConfigList.getConfig('column');

        if (!columnConfig) {
            logMessage('invalid due to missing "column" configuration');
            isOK = false;
        } else {

            const dimensions = columnConfig.dimensions;

            if (dimensions.length !== 2) {
                logMessage(`invalid due number of dimensions (${dimensions.length} !== 2)`);
                isOK = false;
            } else {  // have two columns, see if they are the right type.

                // Only need to check for the first column since only expecting one.
                const xDim = dimensions.getDimension('x');
                console.log(xDim);
                const yDim = dimensions.getDimension('y');
                console.log(yDim);

                if (xDim.numberColumns() != 1 || yDim.numberColumns() != 1) {
                    logMessage('invalid due number of columns in each');
                    isOK = false;
                } else {
                    // At this point we know there's one column in each.
                    const xCol = xDim.columns[0];
                    const yCol = yDim.columns[0]
                    logMessage(`checking types: x: ${xCol} y: ${yCol} against ${numericTypes}`);

                    // Make sure the y-axis is a number
                    if (yCol && !numericTypes.includes(yCol.dataType)) {
                        logMessage('invalid due to non-numeric Y axis type');
                        isOK = false;
                    }
                }
            }
        }
    } catch
        (e) {
        isOK = false;
        errorMessages.push("" + e);
    }

     */

    logMessage('validating the chart config DONE ==========================');

    const res = {isValid: isOK, validationErrorMessage: isOK ? [""] : errorMessages};
    console.log(res);
    return res;
}

/**
 * This function does the actual rendering of the chart.  It needs to be called in the context of emitters.
 * See renderChart.
 */
const _renderChart = async (context: CustomChartContext): Promise<void> => {


    logMessage('_render chart ================================');
    logMessage('context: ', context);

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
    logMessage('Chart model: ', chartModel);

    const tableModel = new TableChartModel(chartModel);
    logMessage('tableModel: ', tableModel);

    let color = defaultColor;
    if (tableModel.visualProps) {
        color = tableModel.visualProps.color;
    }

    // TODO get the measure name (y-col)
    const measure = tableModel.getYData()[0];
    logMessage(`measure: ${JSON.stringify(measure)}`);

    Highcharts.chart('container', {
        title: {
            text: 'Highcharts Histogram In ThoughtSpot'
        },

        xAxis: [{
            title: {text: measure.name},
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

        colors: [color],

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
            data: measure.values,
            id: 's1',
            marker: {
                radius: 1.5
            }
        }]
    });

    logMessage('_render chart DONE ================================');
}

const renderChart = async (context: CustomChartContext): Promise<void> => {
    try {
        await context.emitEvent(ChartToTSEvent.RenderStart);  // tell TS we are starting.
        await _renderChart(context);
    } catch (e) {
        // Tell TS there was an error.
        await context.emitEvent(ChartToTSEvent.RenderError, {
            hasError: true,
            error: e,
        });
    } finally {
        // Tell TS we are done.
        await context.emitEvent(ChartToTSEvent.RenderComplete);
    }
}


const init = async () => {
    logMessage("init called");

    // Standard init with required properties.
    const ctx = await getChartContext({
        getDefaultChartConfig: getDefaultChartConfig,
        validateConfig: getValidateConfig,
        getQueriesFromChartConfig: getQueriesFromChartConfig,
        renderChart: renderChart,
        chartConfigEditorDefinition: getChartConfigEditorDefinition(),
        visualPropEditorDefinition: getVisualPropEditorDefinition(),
    });
    logMessage('rendering');
    await renderChart(ctx);
};

init();