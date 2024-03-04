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
import {TSChartConfigList} from "./TSChartConfig.ts";

// Declare the numeric types for quick checking.
// TODO move to a chart util class.  Maybe move all the classes to a ChartHelpers package.
const NumericTypes = [DataType.DOUBLE, DataType.FLOAT, DataType.INT32, DataType.INT64];

const defaultColor = 'green'; // default chart color.

const logMessage = (msg: string, data: any = "") => {
    console.log(`Histogram: ${msg}`, data);
}

/**
 * Returns the default chart config for the histogram chart type.
 * If there are numeric measures, the first one will be put on the Y column.  If there are attributes (non-numeric),
 * they will all be put on the X-axis in the order received.
 * @param chartModel A chart model (https://ts-chart-sdk-docs.vercel.app/interfaces/ChartModel.html)
 * @return An array of chart configs (https://ts-chart-sdk-docs.vercel.app/interfaces/ChartConfig.html)
 */
const getDefaultChartConfig = (chartModel: ChartModel): ChartConfig[] => {
    logMessage("getting default chart config ===================================", chartModel);

    /*
     export interface ChartConfig {
         key: string;
         dimensions: ChartConfigDimension[];
     }
     */
    const defaultChartConfig: ChartConfig = {key: 'default', dimensions: []};

    // Make sure there is at least one column.
    if (chartModel.columns.length < 1) {
        return [defaultChartConfig];
    }

    /*
      export interface ChartConfigDimension {
        key: string;
        columns: ChartColumn[];
     }
     */
    let firstMeasure = chartModel.columns.find(c => NumericTypes.includes(c.dataType))
    logMessage('first measure: ', firstMeasure);
    if (firstMeasure) {
        const yDimension = {key: 'y', columns: [firstMeasure]};

        logMessage('    adding: ', yDimension);
        defaultChartConfig.dimensions.push(yDimension);
    }

    // Now process the remaining columns.
    const xColumns: ChartColumn[] = [];
    const xDimension = {key: 'x', columns: xColumns};
    for (const c of chartModel.columns) {
        if (c.id !== firstMeasure?.id) {
            logMessage('    adding to xDimension: ', c);
            xDimension.columns.push(c);
        }
    }
    logMessage('    adding: ', xDimension);
    defaultChartConfig.dimensions.push(xDimension);

    logMessage("getting default chart config (DONE) ===================================", defaultChartConfig);

    return [defaultChartConfig];
}

const getChartConfigEditorDefinition = (): ChartConfigEditorDefinition[] => {
    return [
        {
            key: 'column',
            label: 'Custom Column',
            descriptionText: 'must provide at least one measure',
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
 * @param chartConfig
 */
const getQueriesFromChartConfig = (
    chartConfig: ChartConfig[]
): Array<Query> => {
    logMessage('getQueriesFromChartConfig ===============================================================');
    logMessage('get queries from chart config: ', chartConfig);

    let queries: Query[] = [];

    // map all the columns in the config to the query array
    queries = chartConfig.map(
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
    logMessage('getQueriesFromChartConfig (DONE) ========================================================');

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
    let errorMessages: string[] = ["Histograms require a single, numeric Y axis value."];

    try {
        // Find the y column and make sure it only has one value and that it's numeric.
        const yDimension = chartConfigList.getConfigDimension('y');
        console.log(yDimension);

        if (!yDimension) {
            logMessage('invalid due to missing "column" configuration');
            isOK = false;
        } else {

            if (yDimension.columns.length !== 1) {
                logMessage(`invalid due number of Y columns (${yDimension.columns.length} !== 1)`);
                isOK = false;
            } else {  // have at least one y column.  See if it's the right type.

                // Make sure the y-axis is a number
                if (yDimension && !NumericTypes.includes(yDimension.columns[0].dataType)) {
                    logMessage('invalid due to non-numeric Y axis type');
                    isOK = false;
                }
            }
        }
    } catch (e) {
        isOK = false;
        errorMessages.push("" + e);
    }

    logMessage('validating the chart config DONE ==========================');

    const res = {isValid: isOK, validationErrorMessage: isOK ? [""] : errorMessages};
    console.log(res);
    return res;
}

/**
 * Function: _renderChart
 *
 * Description: This function is responsible for rendering a chart using the provided CustomChartContext.
 *
 * Parameters:
 * - context: The CustomChartContext object that contains the necessary data and methods for rendering the chart.
 *
 * Returns: A Promise that resolves to void.
 */

const _renderChart = async (context: CustomChartContext): Promise<void> => {


    logMessage('_render chart ================================');
    logMessage('context: ', context);

    // Original code from https://jsfiddle.net/api/post/library/pure/

    /*
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
    logMessage('tableModel.visualProps ', tableModel.visualProps);
    if (tableModel.visualProps) {
        color = tableModel.visualProps.color;
    }
    logMessage('color', color);

    const measure = tableModel.getYData()[0];  // only want one measure for the histogram.
    logMessage(`measure: ${JSON.stringify(measure)}`);

    // Make sure a measure was found.
    if (!measure) {
        throw new Error(`no measure found in ${JSON.stringify(measure)}`);
    }

    logMessage('values:  ', measure.values);

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
                },
                binsNumber: 5,
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