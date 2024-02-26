/**
 * This file contains a class to make working with the ChartModel easier.
 * See the chart-model.json for an example of the model structure.
 */

import {ChartModel, DataType, ColumnType, ChartColumn, QueryData} from "@thoughtspot/ts-chart-sdk";

import {arraysAreEqual} from "./util.ts";

interface ColumnDescription {
    columnName: string;
    columnId: string;
    columnType: ColumnType;
    dataType: DataType;
}

export class TableChartModelOld {
    private _columns: ColumnDescription[];    // List of the column descriptions.
    private _data: { [key: string]: any[] };  // Data for the columns, indexed by column name.

    constructor(protected chartModel: ChartModel) {
        console.log("TableChartModelOld: chartModel === ", chartModel);

        this.chartModel = chartModel;
        this._columns = [];
        this._data = {};

        this._populate(chartModel);

        console.log('TableChartModelOld ===========================================================');
        console.log(this);
        console.log('TableChartModelOld ===========================================================');
    }

    /**
     * Populates the class with the data from the model.
     * @param chartModel The TS ChartModel object.
     */
    private _populate(chartModel: ChartModel) {
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
        for (const c of chartModel.columns) {
            this._columns.push({columnName: c.name, columnId: c.id, columnType: c.type, dataType: c.dataType});
        }
        console.log('TableChartModelOld: columns === ', this._columns);

        const queryData = this.findDataValue(this._columns, chartModel);

        console.log('TableChartModelOld: query data === ', queryData);

        if (queryData) {
            let idx = 0;  // tracks column indexes to get the correct data.
            for (const colId of queryData.data.columns) {
                const cname = this.getColumnNameForId(colId)!;
                this._data[cname] = [];

                // Load the column of data.  Assuming all columns are the same length.
                for (const dataValue of queryData.data.dataValue) {
                    this._data[cname].push(dataValue[idx]); // Probably OK to not copy.
                }
                idx += 1;
            }
        }

        console.log('TableChartModelOld: data === ', this._data);
    }

    /**
     * Looks at the columns and then searches the data for the entry that contains the actual data values.
     * @param columns List of columns to get the data object for.
     * @param chartModel The chart model to find the data values in.
     * @private
     */
    private findDataValue(columns: ColumnDescription[], chartModel: ChartModel): QueryData | null {

        /*
        The data object looks like the following.  To understand the correct one to choose, you have to compare
        to the columns object.
        "data": [
        {
            "data": {
                "columns": [
                    "60a1c539-e1ed-4e7e-ae89-773bfa60ec8a"
                ],
                "dataValue": [
                    [
                        350
                    ]
                ]
            },
            "totalRowCount": 1
        },
        {
            "data": {
                "columns": [
                    "3e240931-a952-48ff-b748-e5d647f2d125",
                    "60a1c539-e1ed-4e7e-ae89-773bfa60ec8a"
                ],
                "dataValue": [
                    [
                        "Shirts",
                        119
                    ],
             ...
             }
         ]
        */

        if (chartModel.data) {
            for (const d of chartModel.data) {
              if (arraysAreEqual(d.data.columns, columns.map(item => item.columnId))) {
                  return d;
              }
            }
        }

        return null;

    }

    /**
     * Returns a list of the column names in the order originally received.
     */
    get columnNames() {
        return this._columns.map(c => c.columnName);
    }

    /**
     * Returns a list of the column IDs in the order originally received.
     */
    get columnIds() {
        return this._columns.map(c => c.columnId);
    }

    /**
     * Returns the number of columns in the model.
     */
    get length() {
        return this._columns.length;
    }

    /**
     * Returns a column name for the given column ID.  Throws an error if not found.
     * @param columnId The ID to find the name of.
     */
    getColumnNameForId(columnId: string): string | undefined {
        const c = this._columns.find(_ => _.columnId === columnId);
        return c?.columnName;
    }

    /**
     * Returns a column ID for the given column name.  Throws an error if not found.
     * @param columnName The name to find the ID of.
     */
    getColumnIdForName(columnName: string): string | undefined {
        const c = this._columns.find(_ => _.columnName === columnName);
        return c?.columnId;
    }

    /**
     * Returns the data for the column with the given name.
     * @param columnName name of the column.
     * @return An array of values or empty array.
     */
    getDataForColumnName(columnName: string): any[] {
        try {
            return this._data[columnName];
        } catch {
            throw new Error(`No column found with ID ${columnName}`)
        }
    }

    /**
     * Returns the columns with the given column (not data) type.
     * @param columnType The type of columns, such as ColumnType.MEASURE.
     */
    getColumnsWithType(columnType: ColumnType): ColumnDescription[] {
        return this._columns.filter(_ => _.columnType === columnType);
    }

    /**
     * Returns the columns with data of the given type.
     * @param dataType The datatype for the column.
     */
    getColumnsWithDataType(dataType: DataType) {
        return this._columns.filter(_ => _.dataType === dataType);
    }

    /**
     * Returns a list of column descriptions with the data types in the list.
     * @param dataTypes A list of types.
     */
    getColumnsWithDataTypes(dataTypes: DataType[]): ColumnDescription[] {
        const columns: ColumnDescription[] = [];
        for (const dt of dataTypes) {
            columns.push(...this.getColumnsWithDataType(dt));
        }
        return columns;
    }

    /**
     * Returns the data for the column with the given ID.
     * @param columnId The ID of the column.
     */
    getDataForColumnId(columnId: string): any[] {
        const columnName = this.getColumnNameForId(columnId);
        if (!columnName) {
            throw new Error(`No column found with ID ${columnId}`);
        }
        return this.getDataForColumnName(columnName);
    }

    /**
     * Returns a ChartColumn based from the ID.
     * @param columnId The column ID for the type to be used.
     */
    getChartColumn(columnId: string): ChartColumn {
        for (const c of this.chartModel.columns) {
            if (columnId === c.id) {
                return c;
            }
        }
        throw new Error(`Unable to find column ${columnId}`);
    }

}