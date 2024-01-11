/**
 * Creates a histogram based on a column of measures.
 * https://www.highcharts.com/docs/chart-and-series-types/histogram-series
 */

import Highcharts from "highcharts/es-modules/masters/highcharts.src";
import "highcharts/es-modules/masters/modules/histogram-bellcurve.src";

import { TableChartModel } from "./TableChartModel.ts";

import {
    getChartContext,
    ChartModel,
    ChartConfig,
    Query,
    CustomChartContext,
    ChartColumn,
    DataType
} from "@thoughtspot/ts-chart-sdk";

/**
 * Returns the default chart config for the histogram chart type.
 * @param chartModel A chart model (https://ts-chart-sdk-docs.vercel.app/interfaces/ChartModel.html)
 * @return An array of chart configs (https://ts-chart-sdk-docs.vercel.app/interfaces/ChartConfig.html)
 */
const getDefaultChartConfig = (chartModel: ChartModel): ChartConfig[] => {
    console.log("getting default chart config");

    const tableModel = new TableChartModel(chartModel);

    // Make sure there is at least one column and it has to be a number.
    if (tableModel.length < 1) {
        return [];
    }

    const column_key = 'measure';
    let configColumns: ChartColumn[] = [];

    const numericTypes = [DataType.INT32, DataType.INT64, DataType.FLOAT];
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

/**
 * This function would appear to get the queries based on the user configuration in the chart.
 * NOTE: In the sample, this isn't actually called.
 * @param chartConfig
 */
const getQueriesFromChartConfig = (
    chartConfig: ChartConfig[]
): Array<Query> => {
    console.log(chartConfig);
    const queries = Array<Query>()
    return queries;
}

//const getDataModel = (chartModel: ChartModel) => {
//}

const renderChart = async (context: CustomChartContext): Promise<void> => {
    console.log('render chart --------------------------------');
    console.log(context);

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
    console.log(chartModel);
    const tableModel = new TableChartModel(chartModel);

    // TODO Should this be abstracted more?
    const measureName = chartModel.config.chartConfig![0].dimensions[0].columns[0].name;
    console.log(`measure ${measureName}`);

    let data: number[] = tableModel.getDataForColumnName(measureName)

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

    return Promise.resolve();
}


const init = async () => {
    console.log("init called");

    // Standard init with required properties.
    const ctx = getChartContext({
        getDefaultChartConfig: getDefaultChartConfig,
        getQueriesFromChartConfig: getQueriesFromChartConfig,
        renderChart: renderChart,
    });

    console.log(`ctx: ${ctx}`);
};

init();