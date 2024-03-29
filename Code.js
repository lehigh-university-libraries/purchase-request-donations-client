const ISBN_COLUMN = 'A';
const NOTE_COLUMN = 'B';
const LAST_COLUMN = 'B';

function onOpen() {  // eslint-disable-line no-unused-vars
    var ui = SpreadsheetApp.getUi();
    ui.createMenu('Purchase Requests')
        .addItem('Show Sidebar', 'showSidebar')
        .addToUi();
}

function showSidebar() {  // eslint-disable-line no-unused-vars
    var html = HtmlService.createHtmlOutputFromFile('sidebar')
      .setTitle('Create Purchase Requests')
      .setWidth(500);
    SpreadsheetApp.getUi()
      .showSidebar(html);

    watchEdits();
}

function setNoteTemplate(noteTemplate) {  // eslint-disable-line no-unused-vars
    PropertiesService.getScriptProperties().setProperty("noteTemplate", noteTemplate);
}

function watchEdits() {
    // Check if already installed
    const triggers = ScriptApp.getProjectTriggers();
    for (let i=0; i < triggers.length; i++) {
        if (triggers[i].getHandlerFunction() == 'onEdit') {
            console.log("Trigger already installed.")
            return;
        }
    }

    // Install trigger
    ScriptApp.newTrigger('onEdit')
        .forSpreadsheet(SpreadsheetApp.getActive())
        .onEdit()
        .create();
    console.log("Trigger installed.")
}

function onEdit(e) {  // eslint-disable-line no-unused-vars
    let row = e.range.getRow();
    let noteCell = e.source.getRange(NOTE_COLUMN + row);

    let noteTemplate = PropertiesService.getScriptProperties().getProperty("noteTemplate");
    if (noteTemplate != null && noteTemplate.length > 0) {
        noteCell.setValue(noteTemplate);
    }
}

function testProcessSheet() {  // eslint-disable-line no-unused-vars
    processSheet({
        start_row: 2,
        end_row: 2,
        env: 'test'
    });
}

function processSheet(config) {  // eslint-disable-line no-unused-vars
    setHeaders(config);

    let spreadsheet = SpreadsheetApp.getActiveSheet();
    let startRow = parseInt(config.start_row);
    let endRow = parseInt(config.end_row);

    for (let row = startRow; row <= endRow; row++) {
        console.log("Starting on row #" + row);
        let isbn = spreadsheet.getRange(ISBN_COLUMN + row).getValue();
        let note = spreadsheet.getRange(NOTE_COLUMN + row).getValue();

        let response = submitRequest(config, isbn, note);
        let success = response.getResponseCode() == 201;
        updateSheet(spreadsheet, row, success);
    }
}

function setHeaders(config) {
    PropertiesService.getScriptProperties().setProperty("config", JSON.stringify(config));
    let username = PropertiesService.getScriptProperties().getProperty("prp_username");
    let password = Utilities.newBlob(Utilities.base64Decode(
        PropertiesService.getScriptProperties().getProperty("prp_password")))
        .getDataAsString();
    config.headers = {
        "Authorization": "Basic " + Utilities.base64Encode(username + ":" + password)
    };

    let email = Session.getActiveUser().getEmail();
    config.username = email.substring(0, email.indexOf('@'));
}

function submitRequest(config, isbn, note) {
    // getBaseUrl is defined in a private file Config.js
    let url = getBaseUrl(config) + "/purchase-requests";    // eslint-disable-line no-undef

    let purchaseRequest = {
        'isbn': isbn,
        'requesterComments': note,
        'reporterName': config.username,
        'requestType': 'Suggestion'
    };
    let options = {
        'method': 'post',
        'headers': config.headers,
        'contentType': 'application/json',
        'payload': JSON.stringify(purchaseRequest)
    };
    let response = UrlFetchApp.fetch(url, options);
    Logger.log("response: " + response);
    return response;
}

function updateSheet(spreadsheet, row, success) {
    let color = success ? "lightgreen" : "lightcoral";
    let range = spreadsheet.getRange("A" + row + ":" + LAST_COLUMN + row);
    range.setBackground(color);
}
