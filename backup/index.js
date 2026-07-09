/**
 * Cloudflare DNS IP Updater
 * Script tự động cập nhật địa chỉ IP trên Cloudflare DNS
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Đọc records từ file config-records.json
const recordsPath = path.join(__dirname, 'config.json');
let records = [];
try {
  records = JSON.parse(fs.readFileSync(recordsPath, 'utf8'));
} catch (err) {
  console.error('Không thể đọc file config.json:', err.message);
  process.exit(1);
}

// Cấu hình
const config = {
  records, // records được load từ file ngoài
  cloudflare: {
    apiKey: '0rIGd52KVi1vUnUYEa87EEpqGxRKBT772AZjYDjX',
    // Nếu dùng API Token thì không cần email
    //email: '' // Nếu dùng Global API Key
  },
  // Cài đặt chung
  settings: {
    checkInterval: 10 * 60 * 1000,             // Kiểm tra mỗi 10 phút
    logFile: path.join(__dirname, 'ip-updater.log'),  // File log
    cacheFile: path.join(__dirname, 'last-ip.txt')    // File lưu IP cuối cùng
  }
};

/**
 * Lấy địa chỉ IP công khai hiện tại
 * @returns {Promise<string>} Public IP address
 */
function getPublicIP() {
  return new Promise((resolve, reject) => {
    // Sử dụng dịch vụ kiểm tra IP
    const ipCheckServices = [
      { host: 'api.ipify.org', path: '/' }
    ];
    
    // Chọn một dịch vụ ngẫu nhiên
    const service = ipCheckServices[Math.floor(Math.random() * ipCheckServices.length)];
    
    https.get({
      host: service.host,
      path: service.path
    }, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        // Loại bỏ khoảng trắng và xuống dòng
        const ip = data.trim();
        
        // Kiểm tra xem có phải là IP hợp lệ không
        if (/^([0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip)) {
          resolve(ip);
        } else {
          reject(new Error('IP không hợp lệ: ' + ip));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Kiểm tra IP đã lưu trước đó
 * @returns {Promise<string|null>} IP đã lưu hoặc null nếu không có
 */
function getLastSavedIP() {
  return new Promise((resolve) => {
    fs.readFile(config.settings.cacheFile, 'utf8', (err, data) => {
      if (err) {
        // Nếu file không tồn tại hoặc không đọc được, trả về null
        resolve(null);
      } else {
        resolve(data.trim());
      }
    });
  });
}

/**
 * Lưu địa chỉ IP hiện tại vào file
 * @param {string} ip - Địa chỉ IP cần lưu
 */
function saveCurrentIP(ip) {
  return new Promise((resolve, reject) => {
    fs.writeFile(config.settings.cacheFile, ip, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Ghi log
 * @param {string} message - Nội dung cần ghi log
 */
function logMessage(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  
  console.log(logEntry.trim());
  
  fs.appendFile(config.settings.logFile, logEntry, (err) => {
    if (err) {
      console.error('Không thể ghi log:', err);
    }
  });
}

/**
 * Lấy recordId từ Cloudflare dựa trên zoneId, recordName, recordType
 * @param {object} record - Thông tin bản ghi DNS (zoneId, recordName, recordType)
 * @returns {Promise<string>} recordId nếu tìm thấy, null nếu không
 */
function getRecordIdFromCloudflare(record) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.cloudflare.com',
      path: `/client/v4/zones/${record.zoneId}/dns_records?type=${record.recordType}&name=${encodeURIComponent(record.recordName)}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.cloudflare.apiKey}`
      }
    };
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(responseData);
          if (response.success && response.result && response.result.length > 0) {
            resolve(response.result[0].id);
          } else {
            resolve(null);
          }
        } catch (e) {
          reject(new Error('Lỗi xử lý phản hồi khi lấy recordId: ' + e.message));
        }
      });
    });
    req.on('error', (err) => {
      reject(err);
    });
    req.end();
  });
}

/**
 * Lấy IP hiện tại của bản ghi DNS trên Cloudflare
 * @param {object} record - Thông tin bản ghi DNS (zoneId, recordName, recordType)
 * @returns {Promise<string|null>} IP hiện tại trên Cloudflare hoặc null nếu không tìm thấy
 */
async function getCurrentCloudflareIP(record) {
  const recordId = await getRecordIdFromCloudflare(record);
  if (!recordId) return null;
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.cloudflare.com',
      path: `/client/v4/zones/${record.zoneId}/dns_records/${recordId}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.cloudflare.apiKey}`
      }
    };
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(responseData);
          if (response.success && response.result && response.result.content) {
            resolve(response.result.content);
          } else {
            resolve(null);
          }
        } catch (e) {
          reject(new Error('Lỗi xử lý phản hồi khi lấy IP Cloudflare: ' + e.message));
        }
      });
    });
    req.on('error', (err) => {
      reject(err);
    });
    req.end();
  });
}

/**
 * Cập nhật bản ghi DNS trên Cloudflare cho từng record (tự động lấy recordId)
 * @param {string} newIP - Địa chỉ IP mới
 * @param {object} record - Thông tin bản ghi DNS (không cần recordId)
 * @returns {Promise<boolean>} Thành công hay không
 */
async function updateCloudflareRecord(newIP, record) {
  // Lấy recordId nếu chưa có
  let recordId = record.recordId;
  if (!recordId) {
    recordId = await getRecordIdFromCloudflare(record);
    if (!recordId) {
      throw new Error(`Không tìm thấy recordId cho ${record.recordName} (${record.recordType}) trong zone ${record.zoneId}`);
    }
  }
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      type: record.recordType,
      name: record.recordName,
      content: newIP,
      ttl: record.ttl,
      proxied: record.proxied
    });
    const options = {
      hostname: 'api.cloudflare.com',
      path: `/client/v4/zones/${record.zoneId}/dns_records/${recordId}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.cloudflare.apiKey}`,
        'Content-Length': data.length
      }
    };
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(responseData);
          if (response.success) {
            resolve(true);
          } else {
            reject(new Error('Cloudflare API lỗi: ' + JSON.stringify(response.errors)));
          }
        } catch (e) {
          reject(new Error('Lỗi xử lý phản hồi: ' + e.message));
        }
      });
    });
    req.on('error', (err) => {
      reject(err);
    });
    req.write(data);
    req.end();
  });
}

/**
 * Cập nhật tất cả các bản ghi DNS nếu IP public khác với IP trên Cloudflare
 * @param {string} publicIP - IP public của máy
 */
async function updateAllRecordsIfNeeded(publicIP) {
  for (const record of config.records) {
    try {
      const cfIP = await getCurrentCloudflareIP(record);
      if (!cfIP) {
        logMessage(`Không lấy được IP hiện tại trên Cloudflare cho ${record.recordName}`);
        continue;
      }
      logMessage(`IP public: ${publicIP}, IP Cloudflare (${record.recordName}): ${cfIP}`);
      if (publicIP !== cfIP) {
        logMessage(`IP khác nhau, cập nhật DNS cho ${record.recordName}...`);
        await updateCloudflareRecord(publicIP, record);
        logMessage(`Cập nhật thành công DNS cho ${record.recordName} sang IP: ${publicIP}`);
      } else {
        logMessage(`IP Cloudflare cho ${record.recordName} đã đúng, không cần cập nhật.`);
      }
    } catch (error) {
      logMessage(`Lỗi xử lý cho ${record.recordName}: ${error.message}`);
    }
  }
}

/**
 * Kiểm tra và cập nhật IP nếu cần (so sánh với Cloudflare)
 */
async function checkAndUpdateIP() {
  try {
    // Lấy IP hiện tại
    const currentIP = await getPublicIP();
    logMessage(`IP public hiện tại: ${currentIP}`);
    await updateAllRecordsIfNeeded(currentIP);
    // Có thể vẫn lưu IP vào file cache nếu muốn, hoặc bỏ qua
    await saveCurrentIP(currentIP);
  } catch (error) {
    logMessage(`Lỗi: ${error.message}`);
  }
}

/**
 * Hàm main, khởi động chương trình
 */
function start() {
  logMessage('Khởi động dịch vụ cập nhật IP Cloudflare DNS');
  
  // Chạy ngay lập tức một lần
  checkAndUpdateIP();
  
  // Thiết lập kiểm tra định kỳ
  setInterval(checkAndUpdateIP, config.settings.checkInterval);
  
  logMessage(`Đã thiết lập kiểm tra mỗi ${config.settings.checkInterval / 1000 / 60} phút`);
}

// Bắt đầu chương trình
start();