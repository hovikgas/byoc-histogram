/**
 * This file contains a class to make working with the ChartModel easier.
 * The chartModel has the following structure.
 *     {
 *       "columns": [
 *         {
 *           "id": "79344559-4c71-45c6-be33-450316eab54d",
 *           "name": "Column Name",
 *           "type": 2,
 *           "timeBucket": 0,
 *           "dataType": 2,
 *           "format": null
 *         },
 *         ...
 *       ],
 *       "data": [
 *         {
 *           "data": [
 *             {
 *               "columnId": "79344559-4c71-45c6-be33-450316eab54d",
 *               "columnDataType": "CHAR",
 *               "dataValue": [
 *                 "Project 1",
 *                 "Project 1",
 *                 "Project 1",
 *                 "Project 1",
 *                 "Project 2",
 *                 "Project 2",
 *                 "Project 2",
 *                 "Project 2"
 *                 ]
 *               },
 *             ...
 *           ]
 *         }
 *       ],
 *       "sortInfo": [],
 *       "config": {
 *         "chartConfig": []
 *       }
 *     }
 */

import {ChartModel, DataType, ColumnType, ChartColumn} from "@thoughtspot/ts-chart-sdk";

interface ColumnDescription {
    columnName: string;
    columnId: string;
    columnType: ColumnType;
    dataType: DataType;
}

export class TableChartModel {
    private _columns: ColumnDescription[];    // List of the column descriptions.
    private _data: { [key: string]: any[] };  // Data for the columns, indexed by column name.

    constructor(protected chartModel: ChartModel) {
        console.log("TableChartModel: chartModel === ", chartModel);

        this.chartModel = chartModel;
        this._columns = [];
        this._data = {};

        this._populate(chartModel);

        console.log('TableChartMode ===========================================================');
        console.log(this);
        console.log('TableChartMode ===========================================================');
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
        console.log('TableChartModel: columns === ', this._columns);

        /*
           "data": [
             {
               "data": [
                 {
                   "columnId": "79344559-4c71-45c6-be33-450316eab54d",
                   "columnDataType": "CHAR",
                   "dataValue": [
                     "Project 1",
                     "Project 1",
                     "Project 1",
                     "Project 1",
                     "Project 2",
                     "Project 2",
                     "Project 2",
                     "Project 2"
                     ]
                   },
                 ...
               ]
             }
           ],
           ... // but probably only one
        */

        console.log('TableChartModel: chartModel.data === ', chartModel.data);

        if (chartModel.data && chartModel.data.length > 0) {
            // Only using the first data.  It's not clear what the other data items are for.
            const cmData = chartModel.data;
            const firstQueryData = cmData[0];
            const queryDataData = firstQueryData.data;
            console.log('query data data: ', queryDataData);
            const firstData = queryDataData.dataValue[0];
            console.log('first data: ', firstData);
            for (const c of firstData) { // each data array has an ID and dataValue array.
                const cname = this.getColumnNameForId(c.columnId)!;
                this._data[cname] = c.dataValue; // Probably OK to not copy.
            }
        }

        console.log('TableChartModel: data === ', this._data);
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