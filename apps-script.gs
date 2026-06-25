/**
 * MACHINE TRACKER — Google Apps Script Backend
 * Dán code này vào https://script.google.com rồi Deploy → Web App
 * Xem hướng dẫn chi tiết trong HUONG_DAN_CAI_DAT.md
 */

const SHEET_ID = '';  // ← Dán ID Google Sheets của bạn vào đây
const SHEET_RECORDS = 'Records';

// ─── Xử lý POST (lưu phiếu) ──────────────────────────────────
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.action === 'addRecord') {
      return saveRecord(body.data);
    }
    return jsonResp({ status: 'error', message: 'Unknown action' });
  } catch(err) {
    return jsonResp({ status: 'error', message: err.toString() });
  }
}

// ─── Xử lý GET (lấy dữ liệu) ─────────────────────────────────
function doGet(e) {
  const action = e.parameter.action || 'getRecords';
  const date   = e.parameter.date || '';

  if (action === 'getRecords') {
    return getRecords(date);
  }
  return jsonResp({ status: 'error', message: 'Unknown action' });
}

// ─── Lưu phiếu vào Sheets ────────────────────────────────────
function saveRecord(data) {
  const ss = SpreadsheetApp.openById(SHEET_ID || getOrCreateSheet());
  let sheet = ss.getSheetByName(SHEET_RECORDS);

  // Tạo sheet + header nếu chưa có
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_RECORDS);
    const headers = [
      'ID', 'Ngày tạo', 'Ngày', 'Ca', 'Mã máy', 'Tên máy',
      'Người vận hành', 'Tổ trưởng', 'Kỹ thuật',
      'Tổng SL', 'SL lỗi', 'Giờ bắt đầu', 'Giờ kết thúc',
      'Số lần dừng', 'Tổng thời gian dừng (phút)',
      'Chi tiết dừng máy (JSON)', 'Nhà máy'
    ];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  // Tính tổng dừng máy
  const downtimes = data.downtimes || [];
  const totalDowntimeMin = downtimes.reduce((s, d) => s + (d.thoi_gian_phut || 0), 0);

  const row = [
    data.id,
    data.created_at,
    data.ngay,
    data.ca,
    data.ma_may,
    data.ten_may,
    data.nguoi_van_hanh,
    data.to_truong,
    data.ky_thuat,
    data.tong_san_luong || 0,
    data.san_luong_loi  || 0,
    data.gio_bat_dau,
    data.gio_ket_thuc,
    downtimes.length,
    totalDowntimeMin,
    JSON.stringify(downtimes),
    data.factory || '',
  ];

  sheet.appendRow(row);

  // Tô màu dòng nếu có sự cố chưa xử lý
  const hasUnresolved = downtimes.some(d => d.tinh_trang !== 'Đã xử lý');
  if (hasUnresolved) {
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 1, 1, row.length).setBackground('#FFEBEE');
  }

  return jsonResp({ status: 'ok', id: data.id });
}

// ─── Lấy danh sách phiếu ──────────────────────────────────────
function getRecords(filterDate) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_RECORDS);
    if (!sheet) return jsonResp({ status: 'ok', records: [] });

    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    const records = rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    }).filter(r => !filterDate || r['Ngày'] === filterDate);

    return jsonResp({ status: 'ok', records });
  } catch(err) {
    return jsonResp({ status: 'error', message: err.toString() });
  }
}

// ─── Helper ───────────────────────────────────────────────────
function jsonResp(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet() {
  const ss = SpreadsheetApp.create('Machine Tracker - Dữ liệu vận hành');
  return ss.getId();
}
