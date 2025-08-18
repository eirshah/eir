
/*************************************************
 * Google Sheets REST API (Clean Version)
 * - Sheet: Immunization_Register
 * - Unique Key: beneficiary_national_id
 *************************************************/

const SHEET_NAME = "Immunization_Register";
const UNIQUE_KEY = "beneficiary_national_id"; // unique identifier column

/********************
 * Helper Functions *
 ********************/

function getSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
}

function getHeaders(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

function rowToObject(row, headers) {
  const obj = {};
  row.forEach((cell, i) => {
    let val = cell;
    if (val instanceof Date) {
      val = Utilities.formatDate(val, "GMT+5", "yyyy-MM-dd");
    }
    obj[headers[i]] = val;
  });
  return obj;
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*"); // allow frontend fetch
}

function findRowIndex(values, headers, keyValue) {
  const colIndex = headers.indexOf(UNIQUE_KEY);
  return values.findIndex((row, i) => i > 0 && row[colIndex] == keyValue);
}

/********************
 * CRUD Operations  *
 ********************/

function getData(filters = {}) {
  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();

  return values
    .filter(row => row.some(cell => cell !== "")) // skip empty rows
    .map(row => rowToObject(row, headers))
    .filter(row => {
      // Apply dynamic filters
      return Object.keys(filters).every(key =>
        filters[key] == null ||
        String(row[key]).toLowerCase() === String(filters[key]).toLowerCase()
      );
    });
}

function addRow(rowData) {
  const sheet = getSheet();
  const headers = getHeaders(sheet);
  const newRow = headers.map(h => rowData[h] || "");
  sheet.appendRow(newRow);
  return { success: true, message: "Row added successfully" };
}

function updateCell(uniqueId, field, value) {
  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  const headers = values[0];

  const rowIndex = findRowIndex(values, headers, uniqueId);
  if (rowIndex < 0) return { success: false, message: "Record not found" };

  const colIndex = headers.indexOf(field);
  if (colIndex < 0) return { success: false, message: "Field not found" };

  sheet.getRange(rowIndex + 1, colIndex + 1).setValue(value);
  return { success: true, message: "Updated successfully" };
}

function deleteRow(uniqueId) {
  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  const headers = values[0];

  const rowIndex = findRowIndex(values, headers, uniqueId);
  if (rowIndex < 0) return { success: false, message: "Record not found" };

  sheet.deleteRow(rowIndex + 1);
  return { success: true, message: "Row deleted successfully" };
}

/********************
 * Web API Endpoint *
 ********************/

function doGet(e) {
  const action = e.parameter.action;

  try {
    switch (action) {
      case "getData": {
        const filters = e.parameter.filters ? JSON.parse(e.parameter.filters) : {};
        return jsonResponse(getData(filters));
      }

      case "addRow": {
        const newRow = e.parameter.rowData ? JSON.parse(e.parameter.rowData) : {};
        return jsonResponse(addRow(newRow));
      }

      case "updateCell": {
        const update = e.parameter.update ? JSON.parse(e.parameter.update) : {};
        return jsonResponse(updateCell(update.uniqueId, update.field, update.value));
      }

      case "deleteRow": {
        const uniqueId = e.parameter.uniqueId;
        return jsonResponse(deleteRow(uniqueId));
      }

      default:
        return jsonResponse({ error: "Invalid action" });
    }
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}
