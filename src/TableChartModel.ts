/**
 * This file contains a class to make working with the ChartModel easier.
 *
 * See the chart-model.json for an example of the model structure.
 * There are three main sections:
 *   - columns, which describes all the columns in the query.
 *   - data, which contains multiple data results to include measure summaries and the data values as configured.
 *   - visualProps, which contains properties defined for the data, such as color or font
 *   - config, which contains the dimensions that align to each of the data sectons.
 *
 * The config with the dimensions (x,y), describes the chart configuration and is typically the one needed for rendering.
 */

import {ChartColumn, ChartModel,} from "@thoughtspot/ts-chart-sdk";

class DataColumn {
    id: string;
    name: string;
    values: any[] = [];

    constructor(id: string, name: string, values: any[] = []) {
        this.id = id;
        this.name = name;

        this.setValues(values);
    }

    /**
     * Sets the values, overwriting any that might have been set previously.
     * @param values
     */
    setValues(values: any[]) {
        this.values = [...values];
    }
}

/**
 * Data details holds the list of columns by name with the associated data values.  The values can be
 * looked up by name or ID as needed.  Some are the summaries and some are the actual table data.
 */
class DataDetails {

    readonly _summaries: DataColumn[];  // contains all the measure summaries.
    readonly _data: DataColumn[];        // contains the data for the data set.

    constructor() {
        this._summaries = [];
        this._data = [];
    }

    addSummary(dc: DataColumn): void {
        this._summaries.push(dc);
    }

    getSummaries(): DataColumn[] {
        return [...this._summaries];
    }

    /**
     * Finds the summary with the given ID and returns it.
     * @param id The ID to find.
     */
    getSummaryById(id: string): DataColumn | undefined {
        return this._summaries.find(s => s.id === id);
    }

    /**
     * Finds the summary with the given name and returns it.
     * @param name The name to find.
     */
    getSummaryByName(name: string): DataColumn | undefined {
        return this._summaries.find(s => s.name === name);
    }

    /**
     * Adds the data column to the data.
     * @param dc The data column to add.
     */
    addData(dc: DataColumn): void {
        this._data.push(dc);
    }

    /**
     * Finds the data with the given ID and returns it.
     * @param id The ID to find.
     */
    getDataById(id: string): DataColumn | undefined {
        return this._summaries.find(s => s.id === id);
    }

    /**
     * Finds the data with the given name and returns it.
     * @param name The name to find.
     */
    getDataByName(name: string): DataColumn | undefined {
        return this._summaries.find(s => s.name === name);
    }

}

export class TableChartModel {
    private _chartModel: ChartModel; // original chart model.
    readonly allColumns: ChartColumn[] = [];    // list of the column descriptions.
    private _data: DataDetails;  // data in the table model.
    readonly xColumns: string[] = [];
    readonly yColumns: string[] = [];

    // private _sortInfo: any;
    // private visualProps: VisualProps;

    constructor(protected chartModel: ChartModel) {
        console.log("TableChartModel: chartModel === ", chartModel);

        this._chartModel = chartModel;
        this._data = new DataDetails();

        this._populateColumns();
        this._populateData();

        this._setColumnAxes();

        console.log('TableChartModel ===========================================================');
        console.log(this);
        console.log('TableChartModel ===========================================================');
    }

    /**
     * Populates all the column descriptions from the chart model.
     * @private
     */
    _populateColumns(): void {
        /*
         "columns": [
           {
             "id": "79344559-4c71-45c6-be33-450316eab54d",
             "name": "Column Name",
             "type": 2,
             "timeBucket": 0,
             "dataType": 2,
             "format": null
           },
           ...
         ],
         */

        for (const c of this._chartModel.columns) {
            this.allColumns.push({...c});
        }
        console.log('TableChartModel: columns === ', this.allColumns);
    }

    /**
     * Populates the class with the data from the model.
     * @private
     */
    private _populateData() {

        if (this._chartModel.data) {
            this._populateSummaryColumns();
            this._populateDataColumns();
        }

        console.log('TableChartModel: data === ', this._data);
    }

    /**
     * Populates the columns that are only measures.
     * @private
     */
    private _populateSummaryColumns(): void {
        console.log('TableChartModel: populating summary columns =========================');
        // Summary columns are any column in the chart config that consists of a single column and value.
        for (const d of this._chartModel.data!) {
            console.log('  summary query data === ', d);
            if (d.data.columns.length === 1 && d.data.dataValue.length === 1) {
                try {
                    const colId = d.data.columns[0];
                    const colName = this.allColumns.find(c => c.id === colId)!.name;
                    const dataValue = d.data.dataValue[0];

                    const dc = new DataColumn(colId, colName, dataValue);
                    console.log(' adding summary data ', dc);
                    this._data.addSummary(dc);

                } catch (e) {
                    console.error(`Error loading summary columns: ${e}`);
                }

            }
        }

        console.log('TableChartModel: populating summary columns DONE =========================');
    }

    /**
     * Populates the data columns based on the configuration.
     * WARNING: This assumes that the data columns are in a section that has multiple
     * columns and that there is only one set of multi-column data.
     * TODO: Test this assumption since KPIs may only have one value.
     * @private
     */
    private _populateDataColumns(): void {
        console.log('TableChartModel: populating data columns =========================');
        for (const d of this._chartModel.data!) {
            console.log('  data query data === ', d);
            if (d.data.columns.length > 1) { // TODO need to populate for each column.
                // The data is an array of row values, where each row aligns with columns,
                // in the same order.
                for (const colCnt in d.data.columns) {  // go through by column.
                    try {
                        const colId = d.data.columns[colCnt];
                        const column = this.allColumns.find(c => c.id === colId)!;
                        const colName = column.name;

                        const dataValues: any[] = [];
                        for (const rowCnt in d.data.dataValue) {
                            dataValues.push(d.data.dataValue[rowCnt][colCnt]);
                        }

                        const dc = new DataColumn(colId, colName, dataValues);
                        this._data.addData(dc);
                        console.log(' adding data data ', dc);
                    } catch (e) {
                        console.error(`Error loading summary columns: ${e}`);
                    }
                }

            }
        }
        console.log('TableChartModel: populating data columns DONE =========================');
    }

    /**
     * Finds the X and Y columns based on the chart configuration.
     * @private
     */
    private _setColumnAxes(): void {

        if (this._chartModel?.config?.chartConfig) {
            for (const config of this._chartModel.config.chartConfig) {
                if (config.key === "column") {
                    for (const d of config.dimensions) {
                        if (d.key === 'x') {
                            for (const col of d.columns) {
                                this.xColumns.push(col.id);
                            }
                        } else if (d.key === 'y') {
                            for (const col of d.columns) {
                                this.yColumns.push(col.id);
                            }
                        }
                    }
                }
            }
        }
    }

    getXColumnNames(): string[] {
        return this.xColumns;
    }

    getXData(): DataColumn[] {
        const data: DataColumn[] = [];
        for (const columnID of this.xColumns) {
            data.push(this._data.getDataById(columnID)!);
        }
        return data;
    }

    /**
     * Retrieves the names of the Y-columns associated with the current instance.
     * @return {string[]} An array of strings representing the names of the Y-columns.
     */
    getYColumnNames(): string[] {
        return this.yColumns;
    }

    getYData(): DataColumn[] {
        console.log(`TableChartModel: getting y data for columns ${this.yColumns}`);
        const data: DataColumn[] = [];
        for (const columnID of this.yColumns) {
            console.log(`TableChartModel: data for column ${columnID}`);
            data.push(this._data.getDataById(columnID)!);
        }
        return data;
    }

}