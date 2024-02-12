/**
 * This file wraps the ChartConfig from the SDK to make it easier to use.
 */

import {
    ChartColumn, ChartConfig, ChartConfigDimension
} from "@thoughtspot/ts-chart-sdk";

class TSChartDimension {

    readonly key: string = "";
    readonly columns: ChartColumn[];

    constructor(ccd: ChartConfigDimension) {
        this.key = ccd.key;
        this.columns = [...ccd.columns];
    }

    numberColumns () {
        return this.columns.length;
    }

}

class TSChartDimensionList {

    readonly dimensions: { [key: string]: TSChartDimension} = {};

    constructor(dimensions: ChartConfigDimension[]) {
        // Access dimensions by key, such as 'measure', 'x', 'y'
        for (const _ of dimensions) {
            this.dimensions[_.key] = new TSChartDimension(_);
        }
    }

    getDimension (key: string): TSChartDimension {
        return this.dimensions[key];
    }

    get length () {
        return Object.keys(this.dimensions).length;
    }

}

/**
 * Wraps the ChartConfig interface from the SDK.
 */
class TSChartConfig {

    readonly key;
    readonly dimensions: TSChartDimensionList;

    constructor(config: ChartConfig) {
        this.key = config.key;
        this.dimensions = new TSChartDimensionList(config.dimensions);
    }

    get numberDimensions(): number {
        return Object.keys(this.dimensions).length;
    }

    getDimension(key: string): TSChartDimension {
        return this.dimensions.getDimension(key);
    }
}

/**
 * Chart configure array, which wraps a ChartConfig[] from the SDK.
 */
export class TSChartConfigList {

    private _chartConfigs: { [key: string]: TSChartConfig } = {};

    constructor(configs: ChartConfig[]) {
        for (const _ of configs) {
            this._chartConfigs[_.key] = new TSChartConfig(_);
        }
    }

    getConfig(key: string): TSChartConfig {
        return this._chartConfigs[key];
    }
}
