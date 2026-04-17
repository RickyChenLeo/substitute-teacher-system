import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { getTeachers, saveTeachers } from '../utils/storage';
import { analyzeTeacher } from '../utils/aiEngine';

export default function BatchImport({ onNavigate, onImportSuccess }) {
  const [dataPreview, setDataPreview] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  // 當使用者拖放檔案進區域
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  // 當使用者透過點擊選擇檔案
  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
    // 清除選取狀態允許重複選同一個檔案
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processFile = (file) => {
    setErrorMsg('');
    setFileName(file.name);
    
    const isValidExtension = /\.(xlsx|xls|csv)$/i.test(file.name);
    if (!isValidExtension) {
      setErrorMsg('請上傳有效的 Excel (.xlsx, .xls) 或 CSV (.csv) 檔案');
      setDataPreview([]);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' }); // 空白欄位給空字串
        
        if (json.length === 0) {
          setErrorMsg('檔案內沒有資料喔！');
          setDataPreview([]);
          return;
        }

        // 把不同欄位名稱映射進標準格式
        const mappedData = json.map(row => {
          return {
            name: String(row['姓名'] || row['老師姓名'] || row['Name'] || '').trim(),
            phone: String(row['電話'] || row['聯絡電話'] || row['手機'] || row['Phone'] || '').trim(),
            email: String(row['Email'] || row['信箱'] || row['電子郵件'] || row['電子信箱'] || '').trim(),
            education: String(row['學歷'] || row['學歷背景'] || row['最高學歷'] || row['Education'] || '').trim(),
            expertise: String(row['專長'] || row['專長描述'] || row['Expertise'] || '').trim(),
            experience: String(row['經歷'] || row['教學經歷'] || row['教學經驗'] || row['Experience'] || '').trim(),
            note: String(row['備註'] || row['Note'] || '').trim()
          };
        }).filter(item => item.name !== ''); // 過濾掉沒有姓名的空行

        if (mappedData.length === 0) {
          setErrorMsg('找不到有效的老師資料，請確保表頭包含「姓名」欄位！');
          setDataPreview([]);
          return;
        }

        setDataPreview(mappedData);
      } catch (error) {
        console.error("解析錯誤：", error);
        setErrorMsg('無法解析此檔案，請確認檔案格式是否正確。');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (dataPreview.length === 0) return;

    try {
      const existingTeachers = getTeachers();
      const existingNames = new Set(existingTeachers.map(t => t.name.trim()));
      
      const newTeachers = [];
      const addedNames = new Set();

      dataPreview.forEach((teacher, index) => {
        const teacherName = teacher.name.trim();
        // 若系統已存在，或本次匯入檔案中已處理過同名者，便跳過
        if (existingNames.has(teacherName) || addedNames.has(teacherName)) {
          return;
        }
        addedNames.add(teacherName);

        // AI 分析科目推薦
        const recs = analyzeTeacher(teacher);
        const recommendedSubjects = recs.map(r => ({
          id: r.subject.id,
          name: r.subject.name,
          icon: r.subject.icon,
          confidence: r.confidence,
          score: r.score
        }));

        // 產生唯一 ID
        const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5) + index;
        
        newTeachers.push({
          ...teacher,
          recommendedSubjects,
          id,
          createdAt: new Date().toISOString()
        });
      });

      const skippedCount = dataPreview.length - newTeachers.length;

      if (newTeachers.length === 0) {
        alert(`匯入的老師名字都在系統中了（共略過 ${skippedCount} 筆重複資料），沒有新增任何資料。`);
        onNavigate('teachers');
        return;
      }

      await saveTeachers(newTeachers);
      
      const alertMsg = skippedCount > 0 
        ? `✅ 成功匯入 ${newTeachers.length} 位全新代課老師資料！\n(已自動略過 ${skippedCount} 筆同名重複資料)`
        : `✅ 成功匯入 ${newTeachers.length} 位代課老師資料！`;
      
      alert(alertMsg);
      if (onImportSuccess) onImportSuccess();
      onNavigate('teachers');
    } catch (error) {
      alert('匯入失敗，發生未知的錯誤！');
      console.error(error);
    }
  };

  const downloadTemplate = () => {
    // 建立一個範本的工作表
    const ws = XLSX.utils.json_to_sheet([
      {
        '姓名': '王小明',
        '電話': '0912-345-678',
        'Email': 'teacher@example.com',
        '學歷': '國立台灣師範大學體育系畢業',
        '專長': '擅長籃球、網球教學，有體適能指導員證照',
        '經歷': '曾於XX國小代課體育2年',
        '備註': '只能下午代課'
      }
    ]);
    
    // 設定欄寬
    const wscols = [
      {wch: 15}, // 姓名
      {wch: 15}, // 電話
      {wch: 25}, // Email
      {wch: 35}, // 學歷
      {wch: 45}, // 專長
      {wch: 30}, // 經歷
      {wch: 20}  // 備註
    ];
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Teachers");
    
    // 匯出下載
    XLSX.writeFile(wb, "老師資料匯入範本.xlsx");
  };

  const cancelImport = () => {
    setDataPreview([]);
    setFileName('');
    setErrorMsg('');
  };

  return (
    <div className="animate-in">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">批量匯入</h1>
          <p className="page-subtitle">透過上傳 Excel / CSV 一次匯入多位老師資料，系統會自動進行 AI 專長分析</p>
        </div>
        <button className="btn btn-secondary" onClick={downloadTemplate}>
          下載空白範本
        </button>
      </div>

      {!dataPreview.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '600px', margin: '0 auto' }}>
          <div 
            className={`import-dropzone ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current.click()}
            style={{
              border: `2px dashed ${isDragging ? 'var(--primary-500)' : 'var(--border-default)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: '60px 40px',
              textAlign: 'center',
              backgroundColor: isDragging ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-card)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              style={{ display: 'none' }}
            />
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>點擊選擇或拖放檔案至此</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>支援 .xlsx, .xls, .csv 檔案</p>
          </div>
          
          {errorMsg && (
            <div style={{ 
              backgroundColor: 'rgba(239, 68, 68, 0.1)', 
              color: 'var(--danger)', 
              padding: '12px 16px', 
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              fontSize: '14px'
            }}>
              ⚠️ {errorMsg}
            </div>
          )}
          
          <div className="card" style={{ marginTop: '20px' }}>
            <h4 style={{ fontSize: '15px', marginBottom: '12px', color: 'var(--text-primary)' }}>欄位對應說明：</h4>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
              請確保您的檔案擁有表頭（第一列），系統會自動比對以下欄位名稱：<br/>
              • <strong>必填欄位</strong>：姓名 <br/>
              • <strong>選填欄位</strong>：電話、Email、學歷（或學歷背景）、專長（或專長描述）、經歷（或教學經歷）、備註 <br/>
              (如果檔案表頭無法完全對上，您可先下載範本檔案參考)
            </p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600' }}>{fileName}</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                共解析出 {dataPreview.length} 筆有效老師資料
              </p>
            </div>
            <div className="btn-group">
              <button className="btn btn-secondary" onClick={cancelImport}>取消</button>
              <button className="btn btn-primary" onClick={handleImport}>
                開始匯入並分析
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-muted)' }}>姓名</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-muted)' }}>電話</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-muted)' }}>學歷</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-muted)' }}>專長</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-muted)' }}>經歷</th>
                </tr>
              </thead>
              <tbody>
                {dataPreview.slice(0, 50).map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{row.name}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{row.phone || '-'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.education || '-'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.expertise || '-'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.experience || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {dataPreview.length > 50 && (
              <div style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                ... 僅顯示前 50 筆預覽 ...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
