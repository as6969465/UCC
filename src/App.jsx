import './index.css';
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  Package, ArrowRightLeft, Layers, DollarSign, UploadCloud, Calendar, 
  Filter, Settings, Info, FileSpreadsheet, Trash2, Edit2, X, Plus, 
  AlertTriangle, Download, CheckCircle, User, Lock, LogOut, Shield, 
  UserPlus, Users, LockIcon, CheckSquare, FileText, Unlock, ChevronDown, 
  ChevronUp, Truck, FilePlus, DownloadCloud, AlertCircle, Camera, EyeOff
} from 'lucide-react';

// ================= Firebase 雲端多人連線核心 =================
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, onSnapshot, deleteDoc, writeBatch } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD-Qc5Ah_F7WAVNoFex4o0Zp6XqqklUboQ",
  authDomain: "my-link-center.firebaseapp.com",
  projectId: "my-link-center",
  storageBucket: "my-link-center.firebasestorage.app",
  messagingSenderId: "143668775522",
  appId: "1:143668775522:web:188d8fc34e40ea8ef0df3b",
  measurementId: "G-XD0SXCJ239"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "my-link-center";

// 工具函式：陣列切塊 (用於 Batch Write)
const chunkArray = (arr, size) => {
  const result = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
};

// 全域預設設定 (移至元件外避免不必要的重新渲染)
const defaultSettings = { 
  vendorName: 'UCC咖啡', 
  warehouseMap: { '03': { name: '岡山倉', color: 'blue' }, '06': { name: '大肚倉', color: 'green' } }, 
  pcsPerPallet: 600, costPerPallet: 18.5, customLogo: null 
};

// ================= 自訂 Hook: 單一文件狀態同步 (適用於 Settings) =================
function useDocData(docName, initialValue, fbUser) {
  const [state, setState] = useState(initialValue);
  useEffect(() => {
    if (!fbUser || !db) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', docName);
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) setState(snap.data().data);
      else setDoc(docRef, { data: initialValue }, { merge: true });
    }, (error) => console.error(`Sync error on ${docName}:`, error));
    return () => unsubscribe();
  }, [fbUser, docName]);

  const setSyncedState = useCallback((updater) => {
    setState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (fbUser && db) setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', docName), { data: next }, { merge: true });
      return next;
    });
  }, [fbUser, docName]);

  return [state, setSyncedState];
}

// ================= 自訂 Hook: 集合列表同步 (解決 1MB 限制與 Race Condition) =================
function useCollectionData(collectionName, fbUser) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!fbUser || !db) return;
    const colRef = collection(db, 'artifacts', appId, 'public', 'data', collectionName);
    const unsubscribe = onSnapshot(colRef, (snap) => {
      const data = [];
      snap.forEach(document => data.push({ _docId: document.id, ...document.data() }));
      setList(data);
      setLoading(false);
    }, (error) => {
      console.error(`Collection Sync error on ${collectionName}:`, error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fbUser, collectionName]);

  const addOrUpdate = async (id, payload) => {
    if (!fbUser || !db) return;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', collectionName, id), payload, { merge: true });
  };

  const remove = async (id) => {
    if (!fbUser || !db) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', collectionName, id));
  };

  return { list, loading, addOrUpdate, remove };
}

// ================= 全域狀態 Context =================
const AppContext = React.createContext({});

// ================= 工具函式：檔案轉換與下載 =================
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

const triggerBrowserDownload = (base64Data, fileName) => {
  const a = document.createElement('a');
  a.href = base64Data;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

// ================= 獨立抽離的共用元件 =================
const WhBadge = ({ whCode }) => {
  const { warehouseMap } = React.useContext(AppContext);
  const wh = warehouseMap[whCode] || { name: `${whCode}倉`, color: 'gray' };
  const bgColors = { blue: 'bg-blue-500', green: 'bg-emerald-500', red: 'bg-rose-500', orange: 'bg-orange-500', purple: 'bg-purple-500', gray: 'bg-slate-400' };
  const textColors = { blue: 'text-blue-700', green: 'text-emerald-700', red: 'text-rose-700', orange: 'text-orange-700', purple: 'text-purple-700', gray: 'text-slate-600' };
  const borderColors = { blue: 'border-blue-200', green: 'border-emerald-200', red: 'border-rose-200', orange: 'border-orange-200', purple: 'border-purple-200', gray: 'border-slate-200' };
  
  return (
    <div className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-white border shadow-sm ${textColors[wh.color] || textColors.gray} ${borderColors[wh.color] || borderColors.gray}`}>
      <span className={`w-2 h-2 rounded-full mr-1.5 shadow-inner ${bgColors[wh.color] || bgColors.gray}`}></span>
      <span className="text-xs font-extrabold tracking-wide">{wh.name}</span>
    </div>
  );
};

const ConnectionIndicator = () => {
  const { isConnected } = React.useContext(AppContext);
  return (
    <div className={`flex items-center px-3 py-1.5 rounded-full border shadow-sm transition-all duration-300 ${isConnected ? 'bg-emerald-50/90 border-emerald-200' : 'bg-rose-50/90 border-rose-200'}`} title={isConnected ? "即時同步連線中" : "連線中斷或尚未授權"}>
      <span className="relative flex h-2.5 w-2.5 mr-2 shrink-0">
        {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
      </span>
      <div className="flex flex-col text-left justify-center">
        <span className={`text-[10px] font-black leading-none mb-0.5 ${isConnected ? 'text-emerald-700' : 'text-rose-700'}`}>
          {isConnected ? '雲端連線中' : '準備連線中'}
        </span>
        <span className="text-[8px] font-bold text-gray-400 leading-none">
          即時同步機制
        </span>
      </div>
    </div>
  );
};

// ================= 管理員與成員設定 Modal =================
const UserSettingsModal = ({ onClose }) => {
  const { users, updateUser, removeUser, currentUser, setCurrentUser, showToast, showConfirm, tabsConfig } = React.useContext(AppContext);
  const [editMode, setEditMode] = useState(null);
  const [pwdForm, setPwdForm] = useState({ name: currentUser.name, password: currentUser.password });

  const handleApprove = (username) => {
    const user = users.find(u => u.username === username);
    if(user) updateUser(username, { ...user, status: 'approved', permittedTabs: ['inventory', 'inout', 'pallets', 'billing'], permittedSettings: ['pcs', 'cost'] });
    showToast(`已核可帳號：${username}`);
  };

  const handleDelete = (username) => {
    showConfirm(`確定要刪除帳號 [${username}] 嗎？刪除後無法復原。`, () => {
      removeUser(username);
      showToast('帳號已刪除');
    });
  };

  const handleSaveProfile = () => {
    if(!pwdForm.name || !pwdForm.password) return showToast('欄位不可空白', 'error');
    updateUser(currentUser.username, { ...currentUser, name: pwdForm.name, password: pwdForm.password });
    setCurrentUser({...currentUser, name: pwdForm.name, password: pwdForm.password});
    setEditMode(null);
    showToast('個人資料已更新');
  };

  const togglePermission = (username, tabId) => {
    const user = users.find(u => u.username === username);
    if(user) {
      const newTabs = user.permittedTabs.includes(tabId) ? user.permittedTabs.filter(t => t !== tabId) : [...user.permittedTabs, tabId];
      updateUser(username, { ...user, permittedTabs: newTabs });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in text-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col text-left">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-bold text-gray-800 flex items-center">
            {currentUser.role === 'admin' ? <Shield size={18} className="mr-2 text-indigo-600" /> : <User size={18} className="mr-2 text-blue-600" />}
            {currentUser.role === 'admin' ? '系統權限與帳號管理' : '個人資料設定'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-200/50 hover:bg-gray-200 p-1.5 rounded-lg flex justify-center items-center"><X size={20} /></button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm mb-6 text-center">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-bold text-gray-700">我的帳號設定</h4>
              {editMode !== 'profile' && <button onClick={() => setEditMode('profile')} className="text-xs text-blue-600 font-bold hover:underline">編輯資料</button>}
            </div>
            
            {editMode === 'profile' ? (
              <div className="space-y-3">
                <input type="text" value={pwdForm.name} onChange={e => setPwdForm({...pwdForm, name: e.target.value})} placeholder="顯示名稱" className="w-full border border-gray-300 rounded p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-center" />
                <input type="text" value={pwdForm.password} onChange={e => setPwdForm({...pwdForm, password: e.target.value})} placeholder="新密碼" className="w-full border border-gray-300 rounded p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-center" />
                <div className="flex justify-center space-x-2">
                  <button onClick={handleSaveProfile} className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-bold shadow-sm">儲存變更</button>
                  <button onClick={() => setEditMode(null)} className="bg-gray-100 text-gray-600 px-4 py-1.5 rounded text-sm font-bold">取消</button>
                </div>
              </div>
            ) : (
              <div className={`grid grid-cols-2 ${currentUser.role === 'admin' ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4 text-center`}>
                <div><p className="text-xs text-gray-400 font-bold">登入帳號</p><p className="text-sm font-bold">{currentUser.username}</p></div>
                <div><p className="text-xs text-gray-400 font-bold">顯示名稱</p><p className="text-sm font-bold">{currentUser.name}</p></div>
                <div><p className="text-xs text-gray-400 font-bold">目前身分</p><p className="text-sm font-bold text-indigo-600">{currentUser.role === 'admin' ? '系統管理員' : '一般成員'}</p></div>
                {currentUser.role === 'admin' && (
                  <div><p className="text-xs text-gray-400 font-bold">登入次數</p><p className="text-sm font-bold">{currentUser.loginCount || 0} 次</p></div>
                )}
              </div>
            )}
          </div>

          {currentUser.role === 'admin' && (
            <div className="bg-white p-0 rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 bg-indigo-50/50 border-b border-gray-100 flex items-center justify-center">
                <Users size={16} className="text-indigo-600 mr-2" />
                <h4 className="text-sm font-bold text-indigo-900">成員管理清單</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-center">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">帳號</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">名稱</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">登入次數</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">狀態/權限配置</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.filter(u => u.username !== currentUser.username).map(user => (
                      <tr key={user.username} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-sm font-bold text-gray-800">{user.username}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{user.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 font-mono">{user.loginCount}</td>
                        <td className="px-4 py-3 text-center">
                          {user.status === 'pending' ? (
                            <button onClick={() => handleApprove(user.username)} className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full hover:bg-emerald-200 transition-colors">點擊核可申請</button>
                          ) : (
                            <div className="flex flex-col gap-2 my-1">
                              <div className="flex flex-wrap justify-center gap-1.5">
                                {tabsConfig.map(tab => (
                                  <label key={tab.id} className="flex items-center justify-center space-x-1 cursor-pointer bg-white px-2 py-1 rounded border border-gray-200 shadow-sm hover:border-indigo-300">
                                    <input type="checkbox" checked={user.permittedTabs.includes(tab.id)} onChange={() => togglePermission(user.username, tab.id)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"/>
                                    <span className="text-[10px] font-bold text-gray-600">{tab.label.substring(0,2)}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center align-middle">
                          <button onClick={() => handleDelete(user.username)} className="text-red-400 hover:text-red-600 p-1 bg-white rounded border border-transparent hover:border-red-100 shadow-sm transition-colors inline-flex justify-center"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                    {users.length <= 1 && <tr><td colSpan="5" className="px-4 py-8 text-center text-sm text-gray-400">目前尚無其他成員</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ================= 主視圖組件 =================

const InventoryView = () => {
  const { data, availableDates, getWhNameText, handleExportExcel } = React.useContext(AppContext);
  const latestDate = availableDates[availableDates.length - 1] || '';
  const [selectedDate, setSelectedDate] = useState(latestDate);
  
  useMemo(() => { if (availableDates.length > 0 && !availableDates.includes(selectedDate)) setSelectedDate(latestDate); }, [availableDates, selectedDate, latestDate]);

  const isHistorical = selectedDate && latestDate && selectedDate < latestDate;
  const filteredData = useMemo(() => data.filter(d => d.date === selectedDate), [data, selectedDate]);
  
  // 新增：對同倉別、同代號、同批號進行合併計算功能
  const groupedFilteredData = useMemo(() => {
    const map = new Map();
    filteredData.forEach(item => {
      const key = `${item.wh}_${item.itemCode}_${item.batch}`;
      if (map.has(key)) {
        map.get(key).stock += item.stock;
      } else {
        map.set(key, { ...item });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.wh.localeCompare(b.wh) || a.itemCode.localeCompare(b.itemCode));
  }, [filteredData]);

  const totalStock = groupedFilteredData.reduce((sum, item) => sum + item.stock, 0);
  const totalBatches = new Set(groupedFilteredData.map(item => item.batch)).size;

  const doExport = () => {
    const exportData = groupedFilteredData.map(r => ({
      '倉別': getWhNameText(r.wh), '商品代號': r.itemCode, '品名': r.itemName, '分類': r.category, '庫存量': r.stock, '到期日': r.expDate, '最後到店日': r.lastStoreDate, '入倉批號': r.batch
    }));
    handleExportExcel(exportData, `商品庫存明細_${selectedDate}`);
  };

  return (
    <div className="space-y-4 animate-fade-in text-center">
      <div className="flex flex-col xl:flex-row items-center bg-white p-3 rounded-xl shadow-sm border border-gray-200 gap-4">
        <div className="flex flex-wrap items-center justify-center xl:justify-start gap-3 w-full xl:w-auto px-2">
          <div className="flex items-center space-x-2 shrink-0">
            <Calendar className="text-blue-500 shrink-0" size={20} />
            <input 
              type="date" className="border border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 font-bold text-gray-700 px-3 min-w-[150px] text-center bg-white h-10 cursor-pointer hover:bg-gray-50 transition-colors"
              value={selectedDate} min={availableDates[0]} max={latestDate} onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          
          <div className="hidden sm:block h-6 w-px bg-gray-200 mx-1"></div>
          
          <div className="flex items-center h-10 bg-white rounded-lg border border-gray-200 shadow-sm px-4 space-x-2 shrink-0">
            <Package className="text-blue-500 shrink-0" size={16} />
            <span className="text-sm font-bold text-gray-600">庫存量(PCS): <span className="text-blue-700 ml-1">{totalStock.toLocaleString()}</span></span>
          </div>
          
          <div className="flex items-center h-10 bg-white rounded-lg border border-gray-200 shadow-sm px-4 space-x-2 shrink-0">
            <Layers className="text-emerald-500 shrink-0" size={16} />
            <span className="text-sm font-bold text-gray-600">庫存批數: <span className="text-emerald-700 ml-1">{totalBatches}</span></span>
          </div>
        </div>

        {isHistorical && (
          <div className="flex-1 flex items-center justify-center text-amber-700 bg-amber-50 px-4 h-10 rounded-lg border border-amber-200 text-sm font-bold animate-pulse mx-2">
            <AlertTriangle size={16} className="mr-2"/> 歷史資料查詢警示
            <button onClick={() => setSelectedDate(latestDate)} className="ml-4 bg-white/80 hover:bg-white px-2 py-1 rounded text-xs border border-amber-300 transition-colors shadow-sm text-amber-800">清除篩選</button>
          </div>
        )}
        
        <div className="shrink-0 flex justify-end w-full xl:w-auto px-2 xl:ml-auto">
          <button onClick={doExport} className="flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 h-10 rounded-lg text-sm font-bold transition-all shadow-sm shadow-emerald-600/20 w-full xl:w-auto">
            <Download size={16} /> <span>匯出 Excel</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-center">
            <thead className="bg-white sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              <tr>
                {['倉別', '商品代號', '品名', '分類', '庫存量', '到期日', '最後到店日', '入倉批號'].map(h => (
                  <th key={h} className="px-4 py-3.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {groupedFilteredData.length > 0 ? groupedFilteredData.map((row, idx) => (
                <tr key={`${row.itemCode}-${row.batch}-${idx}`} className="transition-colors hover:bg-blue-50/40">
                  <td className="px-4 py-4 whitespace-nowrap text-center align-middle"><WhBadge whCode={row.wh} /></td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 font-mono text-center">{row.itemCode}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-bold text-center">{row.itemName}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center"><span className="px-2.5 py-1 inline-flex text-[11px] font-bold rounded-full border border-gray-200 bg-gray-50 text-gray-600">{row.category}</span></td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-blue-600 font-black text-center">{row.stock.toLocaleString()}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{row.expDate}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{row.lastStoreDate}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-mono font-bold text-blue-900 bg-blue-50/50 text-center">{row.batch}</td>
                </tr>
              )) : <tr><td colSpan="8" className="px-6 py-16 text-center text-gray-400 font-medium">請選擇日期以查看明細</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const InOutView = () => {
  const { data, availableDates, batchFirstAppearance, getWhNameText, handleExportExcel } = React.useContext(AppContext);
  const availableMonths = useMemo(() => [...new Set(data.map(d => d.date.substring(0, 7)))].sort().reverse(), [data]);
  const [selectedMonth, setSelectedMonth] = useState(availableMonths[0] || '');
  const [viewOutDateId, setViewOutDateId] = useState(null);

  const inOutRecords = useMemo(() => {
    if (!data.length) return [];
    const batchMap = new Map();
    const sortedDates = [...availableDates].sort();
    
    sortedDates.forEach(date => {
      const rawDayData = data.filter(d => d.date === date);
      
      // 新增：對當日同批號資料先進行合併，再計算進出差異
      const dayDataMap = new Map();
      rawDayData.forEach(item => {
          const key = `${item.wh}-${item.itemCode}-${item.batch}`;
          if (dayDataMap.has(key)) {
              dayDataMap.get(key).stock += item.stock;
          } else {
              dayDataMap.set(key, { ...item });
          }
      });
      const dayData = Array.from(dayDataMap.values());

      const currentDayKeys = new Set();
      
      dayData.forEach(item => {
        const key = `${item.wh}-${item.itemCode}-${item.batch}`;
        currentDayKeys.add(key);
        
        if (!batchMap.has(key)) {
          batchMap.set(key, {
            id: key, wh: item.wh, batch: item.batch, itemName: item.itemName, expDate: item.expDate,
            inDate: batchFirstAppearance[key] || date, inQty: item.stock, outQty: 0, remainStock: item.stock, outEvents: [], lastSeenDate: date
          });
        } else {
          const record = batchMap.get(key);
          const diff = item.stock - record.remainStock;
          
          if (diff > 0) record.inQty += diff;
          else if (diff < 0) {
            const outAmt = Math.abs(diff);
            record.outQty += outAmt;
            const existingEvent = record.outEvents.find(e => e.date === date);
            if (existingEvent) existingEvent.qty += outAmt;
            else record.outEvents.push({ date, qty: outAmt });
          }
          record.remainStock = item.stock;
          record.lastSeenDate = date;
        }
      });
      
      batchMap.forEach((record, key) => {
        if (!currentDayKeys.has(key) && record.remainStock > 0 && record.lastSeenDate < date) {
           record.outQty += record.remainStock;
           record.outEvents.push({ date, qty: record.remainStock });
           record.remainStock = 0;
           record.lastSeenDate = date;
        }
      });
    });
    
    return Array.from(batchMap.values()).sort((a, b) => b.inDate.localeCompare(a.inDate));
  }, [data, availableDates, batchFirstAppearance]);

  const filteredRecords = selectedMonth 
      ? inOutRecords.filter(r => r.inDate.substring(0, 7) === selectedMonth || r.outEvents.some(e => e.date.substring(0, 7) === selectedMonth)) 
      : inOutRecords;

  const doExport = () => {
    const exportData = filteredRecords.map(r => ({
      '倉別': getWhNameText(r.wh), '入倉批號': r.batch, '品名': r.itemName, '到期日': r.expDate, 
      '入庫日期': r.inDate, '入庫數量': r.inQty, '出庫數量': r.outQty, '剩餘庫存': r.remainStock, 
      '出庫明細': r.outEvents.length > 0 ? r.outEvents.map(e => `${e.date} (出庫 ${e.qty})`).join(' , ') : '無移出紀錄'
    }));
    handleExportExcel(exportData, `庫存進出紀錄_${selectedMonth || '全部'}`);
  };

  return (
    <div className="space-y-4 animate-fade-in text-center">
      <div className="flex flex-col xl:flex-row items-center bg-white p-3 rounded-xl shadow-sm border border-gray-200 gap-4">
        <div className="flex items-center space-x-4 shrink-0 px-2 w-full xl:w-auto justify-center xl:justify-start">
          <Filter className="text-blue-500" />
          <input 
            type="month" className="border border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 font-bold text-gray-700 px-3 min-w-[160px] text-center bg-white h-10 cursor-pointer hover:bg-gray-50 transition-colors"
            value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>
        <div className="text-sm text-blue-700 bg-blue-50/50 px-4 h-10 rounded-lg flex items-center justify-center font-bold shadow-sm flex-1 mx-4 w-full xl:w-auto border border-blue-100/50">
          <Info size={16} className="mr-2 shrink-0"/> 月份篩選以批號出入庫進行記錄，點選「清除」為顯示全部明細。
        </div>
        <div className="shrink-0 flex justify-end w-full xl:w-auto px-2 ml-auto">
          <button onClick={doExport} className="flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 h-10 rounded-lg text-sm font-bold transition-shadow shadow-sm shadow-emerald-600/20 w-full xl:w-auto"><Download size={16} /> <span>匯出 Excel</span></button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-center">
            <thead className="bg-white sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              <tr>
                {['倉別', '入倉批號', '品名', '到期日', '入庫日期', '入庫數量', '出庫數量', '剩餘庫存', '出庫明細 (分批紀錄)'].map(h => (
                  <th key={h} className="px-4 py-3.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredRecords.length > 0 ? filteredRecords.map((row) => (
                <tr key={row.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-4 whitespace-nowrap text-center align-middle"><WhBadge whCode={row.wh} /></td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-mono font-bold text-blue-900 bg-blue-50/50 text-center">{row.batch}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-bold text-center">{row.itemName}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{row.expDate}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 font-bold text-center">{row.inDate}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-black text-emerald-600 text-center">{row.inQty > 0 ? `+${row.inQty.toLocaleString()}` : '-'}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-black text-rose-500 text-center">{row.outQty > 0 ? `-${row.outQty.toLocaleString()}` : '-'}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-blue-600 font-black text-center">{row.remainStock.toLocaleString()}</td>
                  <td className="px-4 py-4 text-sm text-center align-middle min-w-[160px]">
                    {row.outEvents.length > 0 ? (
                      viewOutDateId === row.id ? (
                        <div 
                           className="inline-flex flex-col items-center justify-center cursor-pointer text-rose-700 bg-rose-50 px-3 py-2 rounded-lg border border-rose-200 hover:bg-rose-100 transition-colors space-y-1.5 w-full"
                           onClick={() => setViewOutDateId(null)} title="點擊收起"
                        >
                           {row.outEvents.map((evt, idx) => (
                             <div key={idx} className="text-xs font-bold whitespace-nowrap bg-white px-2 py-0.5 rounded border border-rose-100/50 w-full flex justify-between">
                               <span>{evt.date}</span>
                               <span className="opacity-75">(-{evt.qty.toLocaleString()})</span>
                             </div>
                           ))}
                           <div className="text-[10px] text-rose-400 font-bold pt-1 border-t border-rose-200 w-full text-center tracking-widest"><ChevronUp size={14} className="inline"/> 收起明細</div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setViewOutDateId(row.id)}
                          className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800 bg-white hover:bg-blue-50 px-3 py-1.5 rounded-lg font-bold transition-colors border border-gray-200 hover:border-blue-300 text-xs shadow-sm w-full"
                        >
                          查看明細 ({row.outEvents.length}筆) <ChevronDown size={14} className="ml-1"/>
                        </button>
                      )
                    ) : <span className="inline-flex items-center justify-center text-gray-400 font-medium text-xs bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">無移出紀錄</span>}
                  </td>
                </tr>
              )) : <tr><td colSpan="9" className="px-6 py-16 text-center text-gray-400 font-medium">此區間無異動紀錄，或資料不足以供比對</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const PalletStatsView = () => {
  const { data, pcsPerPallet, warehouseMap, getWhNameText, handleExportExcel, currentUser, setSettings, availableDates } = React.useContext(AppContext);
  const [draftPcs, setDraftPcs] = useState(pcsPerPallet);
  const [startDate, setStartDate] = useState(availableDates[0] || '');
  const [endDate, setEndDate] = useState(availableDates[availableDates.length - 1] || '');

  useEffect(() => setDraftPcs(pcsPerPallet), [pcsPerPallet]);

  const commitPcs = () => {
      if (currentUser?.role !== 'admin') return;
      setSettings(s => ({ ...s, pcsPerPallet: Number(draftPcs) || 1 }));
  };

  const stats = useMemo(() => {
    const result = {};
    const whSet = new Set();
    
    data.forEach(item => {
      if(item.date >= startDate && item.date <= endDate) {
          whSet.add(item.wh);
          if (!result[item.date]) result[item.date] = { total: 0 };
          if (!result[item.date][item.wh]) result[item.date][item.wh] = { qty: 0, pallets: 0 };
          result[item.date][item.wh].qty += item.stock;
          // 與結帳報表一致：每筆（品項+批號）各自進位後再加總
          result[item.date][item.wh].pallets += Math.ceil(item.stock / pcsPerPallet);
      }
    });

    const warehouses = [...whSet].sort();
    const tableData = Object.keys(result).sort().reverse().map(date => {
      let totalPallet = 0;
      const rowData = { date };
      warehouses.forEach(wh => {
        const qty = result[date][wh]?.qty || 0;
        const pallets = result[date][wh]?.pallets || 0;
        rowData[wh] = { qty, pallets };
        totalPallet += pallets;
      });
      rowData.totalPallet = totalPallet;
      return rowData;
    });

    return { warehouses, tableData };
  }, [data, pcsPerPallet, startDate, endDate, availableDates]);

  const doExport = () => {
    const exportData = stats.tableData.map(row => {
      const obj = { '日期': row.date };
      stats.warehouses.forEach(wh => {
        obj[`${getWhNameText(wh)} 數量`] = row[wh]?.qty || 0;
        obj[`${getWhNameText(wh)} 板數`] = row[wh]?.pallets || 0;
      });
      obj['合計總板數'] = row.totalPallet;
      return obj;
    });
    handleExportExcel(exportData, `庫存棧板統計_${startDate}_${endDate}`);
  };

  const getWhRowBgColor = (wh) => {
     const color = warehouseMap[wh]?.color || 'gray';
     const bgMap = { blue: 'bg-blue-50/40', green: 'bg-emerald-50/40', red: 'bg-rose-50/40', orange: 'bg-orange-50/40', purple: 'bg-purple-50/40', gray: 'bg-slate-50/40' };
     return bgMap[color];
  };

  const canViewPcs = currentUser.role === 'admin';

  return (
    <div className="space-y-4 animate-fade-in text-center">
      <div className="flex flex-col md:flex-row items-center bg-white p-3 rounded-xl shadow-sm border border-gray-200 gap-4">
        <div className="flex flex-wrap gap-4 items-center justify-center xl:justify-start flex-1 w-full xl:w-auto px-2">
            <div className="flex items-center space-x-3">
              <Calendar className="text-blue-500" />
              <div className="flex items-center space-x-2 bg-white rounded-lg p-1 border border-gray-300 shadow-sm h-10">
                <input type="date" className="bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-700 py-1 px-2 text-center cursor-pointer" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <span className="text-gray-400 font-medium">至</span>
                <input type="date" className="bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-700 py-1 px-2 text-center cursor-pointer" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="hidden md:block h-6 w-px bg-gray-200"></div>
            
            {canViewPcs && (
              <div className="flex items-center space-x-3 h-10 bg-white rounded-lg px-4 border border-gray-200 shadow-sm">
                <Settings className="text-blue-500" size={16} />
                <label className="text-sm font-bold text-gray-600">數量轉換棧板 (PCS/板):</label>
                {currentUser.role === 'admin' ? (
                    <input type="number" className="border-b border-gray-300 w-16 text-center font-black text-blue-700 focus:outline-none focus:border-blue-500 bg-transparent py-1" value={draftPcs} onChange={(e) => setDraftPcs(e.target.value)} onBlur={commitPcs} onKeyDown={(e) => e.key === 'Enter' && commitPcs()} min="1" />
                ) : (
                    <div className="w-16 text-center font-black text-gray-500 bg-gray-50 rounded border border-gray-200">{pcsPerPallet}</div>
                )}
              </div>
            )}
        </div>
        <div className="shrink-0 flex justify-end w-full xl:w-auto px-2 ml-auto">
          <button onClick={doExport} className="flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 h-10 rounded-lg text-sm font-bold transition-shadow shadow-sm shadow-emerald-600/20 w-full xl:w-auto"><Download size={16} /> <span>匯出 Excel</span></button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-center">
            <thead className="bg-white sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              <tr>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">日期</th>
                {stats.warehouses.map(wh => (
                  <th key={wh} className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider border-l border-gray-100">
                    <div className="flex items-center justify-center space-x-1">
                      <WhBadge whCode={wh} />
                      <span className="text-[11px] text-gray-500 font-bold">(數量/板數)</span>
                    </div>
                  </th>
                ))}
                <th className="px-6 py-4 text-center text-xs font-bold text-orange-800 uppercase tracking-wider bg-orange-50 border-l border-orange-100">合計總板數</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.tableData.length > 0 ? stats.tableData.map((row, idx) => (
                <tr key={idx} className="transition-colors hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-center align-middle">{row.date}</td>
                  {stats.warehouses.map(wh => (
                    <td key={wh} className={`px-6 py-4 whitespace-nowrap text-sm text-center text-gray-600 align-middle border-l border-white/50 ${getWhRowBgColor(wh)}`}>
                      {row[wh]?.qty.toLocaleString() || 0} / <span className="font-bold text-gray-900">{row[wh]?.pallets || 0} 板</span>
                    </td>
                  ))}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-black text-orange-600 bg-orange-50/30 text-lg align-middle border-l border-orange-50">
                    {row.totalPallet} 板
                  </td>
                </tr>
              )) : <tr><td colSpan={stats.warehouses.length + 2} className="px-6 py-12 text-center text-gray-400 font-medium">請選擇日期區間以查看資料</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ================= 結帳報表 Modal =================
const BillingManagerModal = ({ onClose }) => {
  const { billingLocks, updateBillingLock, removeBillingLock, currentUser, showToast, showConfirm, warehouseMap } = React.useContext(AppContext);
  const fileInputRef = useRef(null);
  const [activeUploadId, setActiveUploadId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const handleUnlock = (id) => {
    const lock = billingLocks.find(l => l.id === id);
    showConfirm('確定要解除此區間的結帳鎖定嗎？', () => {
      if(lock) updateBillingLock(id, { ...lock, status: 'locked', confirmedBy: null });
      showToast('已解除該區間確認狀態，退回為「待確認」', 'success');
    });
  };

  const handleDeleteLock = (id) => {
    showConfirm('確定要刪除此結帳區間紀錄嗎？刪除後無法復原。', () => {
      removeBillingLock(id);
      showToast('已刪除該結帳區間', 'success');
    });
  };

  const handleConfirm = (id) => {
    const lock = billingLocks.find(l => l.id === id);
    if(lock) updateBillingLock(id, { ...lock, status: 'confirmed', confirmedBy: currentUser.name });
    showToast('已確認結帳費用，請等待管理員上傳發票', 'success');
  };

  const triggerUpload = (id) => {
    setActiveUploadId(id);
    fileInputRef.current.click();
  };

  const handleDeleteInvoice = (lockId, fileName) => {
    const lock = billingLocks.find(l => l.id === lockId);
    if (!lock) return;
    showConfirm(`確定要刪除發票檔案 [${fileName}] 嗎？`, () => {
      const newFiles = lock.invoiceFiles.filter(f => (typeof f === 'string' ? f : f.name) !== fileName);
      updateBillingLock(lockId, { ...lock, invoiceFiles: newFiles, status: newFiles.length === 0 ? 'confirmed' : lock.status });
      showToast(`已刪除發票：${fileName}`, 'success');
    });
  };

  const toggleMemberDownload = (lockId) => {
    const lock = billingLocks.find(l => l.id === lockId);
    if(lock) {
      const currentStatus = lock.allowMemberDownload !== false;
      updateBillingLock(lockId, { ...lock, allowMemberDownload: !currentStatus });
      showToast('已更新成員的下載權限', 'success');
    }
  };

  const handleDownloadSingleInvoice = (lock, fileObj) => {
    if (currentUser.role === 'member' && lock.allowMemberDownload === false) {
       return showToast('管理員已關閉此區間的發票下載權限', 'error');
    }
    
    const fileName = typeof fileObj === 'string' ? fileObj : fileObj.name;
    const fileData = typeof fileObj === 'string' ? null : fileObj.data;

    if (fileData) {
      triggerBrowserDownload(fileData, fileName);
    } else {
      const fileContent = `【系統模擬憑證檔案】\n結帳區間：${lock.startDate} ~ ${lock.endDate}\n對應檔名：${fileName}\n下載時間：${new Date().toLocaleString()}\n\n(註：此為雲端展示環境舊版測試資料)`;
      const dataUri = 'data:text/plain;charset=utf-8,' + encodeURIComponent(fileContent);
      triggerBrowserDownload(dataUri, `${fileName}_憑證內容.txt`);
    }
    showToast(`已為您下載發票：${fileName}`, 'success');
  };

  const handleDownloadInvoices = (lock) => {
    if (currentUser.role === 'member' && lock.allowMemberDownload === false) {
       return showToast('管理員已關閉此區間的發票下載權限', 'error');
    }
    if (!lock.invoiceFiles || lock.invoiceFiles.length === 0) {
       return showToast('尚無發票檔案可供下載', 'error');
    }
    
    lock.invoiceFiles.forEach((fileObj, idx) => {
      setTimeout(() => {
        handleDownloadSingleInvoice(lock, fileObj);
      }, idx * 600);
    });
    showToast('已開始為您逐一下載發票憑證', 'success');
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0 || !activeUploadId) return;
    const lock = billingLocks.find(l => l.id === activeUploadId);
    if(!lock) return;

    const maxSize = 1024 * 500; 
    const validFiles = [];
    const invalidFiles = [];
    
    files.forEach(file => {
      if (file.size <= maxSize) validFiles.push(file);
      else invalidFiles.push(file.name);
    });

    if (invalidFiles.length > 0) {
      showToast(`以下檔案超過 500KB 限制，無法上傳：${invalidFiles.join(', ')}`, 'error');
      if (validFiles.length === 0) return;
    }
    
    try {
      const base64Files = await Promise.all(
        validFiles.map(async (file) => {
          const base64Data = await fileToBase64(file);
          return { name: file.name, data: base64Data };
        })
      );

      const existingFiles = lock.invoiceFiles || [];
      updateBillingLock(activeUploadId, { 
        ...lock, 
        status: 'completed', 
        invoiceFiles: [...existingFiles, ...base64Files], 
        allowMemberDownload: lock.allowMemberDownload !== undefined ? lock.allowMemberDownload : true 
      });
      
      showToast(`${validFiles.length} 份發票檔案已成功上傳，該區間已正式結案！`, 'success');
    } catch (error) {
      showToast('檔案轉換失敗，請重新操作上傳', 'error');
      console.error('File upload error:', error);
    }
    
    setActiveUploadId(null);
    e.target.value = '';
  };

  const warehouses = Object.keys(warehouseMap).sort();

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in text-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden max-h-[95vh] flex flex-col text-left">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-slate-800">
          <h3 className="text-lg font-bold text-white flex items-center">
            <FileText size={20} className="mr-2 text-indigo-400" /> 結帳管理看板 (Billing Board)
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1.5"><X size={20} /></button>
        </div>
        
        <div className="p-0 overflow-y-auto flex-1 bg-gray-50">
          <input type="file" accept=".pdf" multiple className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          <table className="min-w-full divide-y divide-gray-200 text-center relative">
            <thead className="bg-white sticky top-0 z-20 shadow-sm">
              <tr>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase">結帳區間</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase">總金額 (倉租+上收)</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase">狀態</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase">確認人員</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase">發票檔案 (PDF)</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase">操作與明細</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {billingLocks.length > 0 ? billingLocks.sort((a,b) => b.startDate.localeCompare(a.startDate)).map(lock => (
                <React.Fragment key={lock.id}>
                  <tr className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-800">{lock.startDate} ~ {lock.endDate}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-black text-emerald-600">${(lock.totalAmount || 0).toLocaleString()}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      {lock.status === 'locked' && <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">待成員確認</span>}
                      {lock.status === 'confirmed' && <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">已確認 / 待上傳</span>}
                      {lock.status === 'completed' && <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">已結案</span>}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-600">{lock.confirmedBy || '-'}</td>
                    <td className="px-4 py-4 text-sm font-bold text-gray-500 max-w-[200px] truncate">
                      {lock.invoiceFiles && lock.invoiceFiles.length > 0 ? (
                        <div className="flex flex-wrap gap-1 justify-center">
                          {lock.invoiceFiles.map((fileObj, idx) => {
                             const fileName = typeof fileObj === 'string' ? fileObj : fileObj.name;
                             const canDownload = currentUser.role === 'admin' || lock.allowMemberDownload !== false;
                             return (
                               <span 
                                 key={idx} 
                                 onClick={() => { if (canDownload) handleDownloadSingleInvoice(lock, fileObj); else showToast('管理員已關閉此區間下載權限', 'error'); }}
                                 className={`inline-flex items-center border px-2 py-1 rounded text-xs group ${canDownload ? 'bg-gray-100 border-gray-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 cursor-pointer transition-colors' : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'}`}
                                 title={canDownload ? "點擊下載此發票" : "停止下載"}
                               >
                                 <FileText size={10} className="mr-1"/> {fileName.length > 10 ? fileName.substring(0,8)+'...' : fileName}
                                 {currentUser.role === 'admin' && (
                                   <button onClick={(e) => { e.stopPropagation(); handleDeleteInvoice(lock.id, fileName); }} className="ml-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" title="刪除此發票">
                                     <X size={12} />
                                   </button>
                                 )}
                               </span>
                             );
                          })}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {currentUser.role === 'admin' && lock.status === 'confirmed' && (
                            <>
                              <button onClick={() => handleUnlock(lock.id)} className="bg-white border border-gray-300 text-gray-600 hover:text-amber-600 hover:border-amber-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors inline-flex items-center shadow-sm"><Unlock size={12} className="mr-1" /> 退回解鎖</button>
                              <button onClick={() => triggerUpload(lock.id)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors inline-flex items-center shadow-sm"><UploadCloud size={12} className="mr-1" /> 上傳發票</button>
                            </>
                        )}
                        {currentUser.role === 'admin' && lock.status !== 'completed' && (
                            <button onClick={() => handleDeleteLock(lock.id)} className="bg-white border border-gray-300 text-rose-500 hover:bg-rose-50 hover:border-rose-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors inline-flex items-center shadow-sm"><Trash2 size={12} className="mr-1" /> 刪除</button>
                        )}
                        {currentUser.role === 'member' && lock.status === 'locked' && (
                            <button onClick={() => handleConfirm(lock.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors inline-flex items-center shadow-sm"><CheckSquare size={12} className="mr-1" /> 確認費用正確</button>
                        )}
                        {lock.status === 'completed' && (
                             currentUser.role === 'admin' ? (
                               <button onClick={() => handleDownloadInvoices(lock)} className="bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors inline-flex items-center shadow-sm"><DownloadCloud size={12} className="mr-1" /> 全部下載</button>
                             ) : lock.allowMemberDownload === false ? (
                               <span className="bg-gray-50 border border-gray-200 text-gray-400 px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center shadow-sm cursor-not-allowed" title="管理員已關閉此區間下載權限"><EyeOff size={12} className="mr-1" /> 停止下載</span>
                             ) : null
                        )}
                        {currentUser.role === 'admin' && lock.status === 'completed' && (
                            <button 
                              onClick={() => toggleMemberDownload(lock.id)} 
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors inline-flex items-center shadow-sm border ${lock.allowMemberDownload !== false ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'}`}
                              title={lock.allowMemberDownload !== false ? "點擊關閉一般成員下載" : "點擊開放一般成員下載"}
                            >
                              {lock.allowMemberDownload !== false ? <EyeOff size={12} className="mr-1"/> : <DownloadCloud size={12} className="mr-1"/>}
                              {lock.allowMemberDownload !== false ? '關閉下載' : '開放下載'}
                            </button>
                        )}
                        
                        <button 
                          onClick={() => setExpandedId(expandedId === lock.id ? null : lock.id)} 
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors inline-flex items-center shadow-sm border ${expandedId === lock.id ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                        >
                          {expandedId === lock.id ? <ChevronUp size={14} className="mr-1"/> : <ChevronDown size={14} className="mr-1"/>}
                          區間明細
                        </button>
                      </div>
                    </td>
                  </tr>
                  
                  {expandedId === lock.id && (
                    <tr className="bg-slate-50/80 border-b-2 border-indigo-100/50">
                      <td colSpan="6" className="p-4">
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                          {/* 倉租費明細 */}
                          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                             <div className="bg-blue-50/50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                               <h4 className="text-sm font-bold text-blue-800">倉租費明細 {currentUser.role === 'admin' && `(計費單價: ${lock.rate} 元/板)`}</h4>
                               <span className="text-xs font-black text-blue-700">小計: ${(lock.storageAmount || 0).toLocaleString()}</span>
                             </div>
                             <div className="overflow-y-auto max-h-48">
                               <table className="min-w-full text-center text-xs">
                                 <thead className="bg-gray-50 sticky top-0">
                                   <tr>
                                     <th className="py-2 px-2 font-bold text-gray-500">日期</th>
                                     {warehouses.map(wh => <th key={wh} className="py-2 px-2 font-bold text-gray-500">{warehouseMap[wh]?.name || wh}</th>)}
                                     <th className="py-2 px-2 font-bold text-gray-500">合計板數</th>
                                   </tr>
                                 </thead>
                                 <tbody className="divide-y divide-gray-100">
                                   {lock.storageDetails && lock.storageDetails.length > 0 ? lock.storageDetails.map(day => (
                                      <tr key={day.date}>
                                        <td className="py-2 px-2 font-bold text-gray-700">{day.date}</td>
                                        {warehouses.map(wh => <td key={wh} className="py-2 px-2 text-gray-600">{day.details[wh] || 0} 板</td>)}
                                        <td className="py-2 px-2 font-bold text-rose-600">{day.pallets} 板</td>
                                      </tr>
                                   )) : <tr><td colSpan={warehouses.length+2} className="py-4 text-gray-400">無紀錄</td></tr>}
                                 </tbody>
                               </table>
                             </div>
                          </div>
                          
                          {/* 上收費明細 */}
                          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                             <div className="bg-indigo-50/50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                               <h4 className="text-sm font-bold text-indigo-800">上收費明細</h4>
                               <span className="text-xs font-black text-indigo-700">小計: ${(lock.receivingAmount || 0).toLocaleString()}</span>
                             </div>
                             <div className="overflow-y-auto max-h-48">
                               <table className="min-w-full text-center text-xs">
                                 <thead className="bg-gray-50 sticky top-0">
                                   <tr>
                                     <th className="py-2 px-2 font-bold text-gray-500">進貨日</th>
                                     <th className="py-2 px-2 font-bold text-gray-500">車趟</th>
                                     <th className="py-2 px-2 font-bold text-gray-500">運費</th>
                                     <th className="py-2 px-2 font-bold text-gray-500">小計</th>
                                   </tr>
                                 </thead>
                                 <tbody className="divide-y divide-gray-100">
                                   {lock.receivingDetails && lock.receivingDetails.length > 0 ? lock.receivingDetails.map((rec, i) => (
                                      <tr key={i}>
                                        <td className="py-2 px-2 font-bold text-gray-700">{rec.date}</td>
                                        <td className="py-2 px-2 text-gray-600">{rec.route}</td>
                                        <td className="py-2 px-2 text-gray-600">${rec.freight}</td>
                                        <td className="py-2 px-2 font-bold text-indigo-600">${rec.subtotal}</td>
                                      </tr>
                                   )) : <tr><td colSpan="4" className="py-4 text-gray-400">無紀錄</td></tr>}
                                 </tbody>
                               </table>
                             </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )) : (
                <tr><td colSpan="6" className="px-6 py-16 text-center text-gray-400 font-medium">尚無任何結帳紀錄</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const BillingView = () => {
  const { data, receivingRecords, availableDates, pcsPerPallet, costPerPallet, warehouseMap, getWhNameText, handleExportExcel, showToast, billingLocks, updateBillingLock, currentUser, setSettings } = React.useContext(AppContext);

  const defaultDates = useMemo(() => {
      const completedLocks = billingLocks.filter(l => l.status === 'completed');
      let start = availableDates[0] || '';
      if (completedLocks.length > 0) {
          const maxDate = completedLocks.reduce((max, lock) => lock.endDate > max ? lock.endDate : max, '');
          const nextDateObj = availableDates.find(d => d > maxDate);
          if (nextDateObj) start = nextDateObj;
          else start = availableDates[availableDates.length - 1] || '';
      }
      return { start, end: availableDates[availableDates.length - 1] || '' };
  }, [availableDates, billingLocks]);

  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);

  const [showBillingModal, setShowBillingModal] = useState(false);
  const [billingSubTab, setBillingSubTab] = useState('storage');

  const [draftCost, setDraftCost] = useState(costPerPallet);

  useEffect(() => setDraftCost(costPerPallet), [costPerPallet]);
  
  const commitCost = () => {
      if (currentUser?.role !== 'admin') return;
      setSettings(s => ({ ...s, costPerPallet: Number(draftCost) || 0 }));
  };

  const currentLock = billingLocks.find(l => l.startDate === startDate && l.endDate === endDate);
  const hasOverlapCompleted = billingLocks.some(l => l.status === 'completed' && l.startDate <= endDate && l.endDate >= startDate && l.id !== currentLock?.id);
  const isGreyedOut = hasOverlapCompleted || currentLock?.status === 'completed';

  const storageStats = useMemo(() => {
    const result = {};
    const activeDates = availableDates.filter(d => d >= startDate && d <= endDate);
    activeDates.forEach(date => { result[date] = { date, pallets: 0, cost: 0, details: {} }; });

    data.forEach(item => {
      if (item.date >= startDate && item.date <= endDate) {
        if (!result[item.date]) result[item.date] = { date: item.date, pallets: 0, cost: 0, details: {} };
        if (!result[item.date].details[item.wh]) result[item.date].details[item.wh] = 0;
        
        const dailyPallets = Math.ceil(item.stock / pcsPerPallet);
        result[item.date].details[item.wh] += dailyPallets;
        result[item.date].pallets += dailyPallets;
      }
    });
    
    return Object.values(result).map(day => ({ ...day, cost: Math.round(day.pallets * costPerPallet) })).sort((a, b) => a.date.localeCompare(b.date));
  }, [data, startDate, endDate, pcsPerPallet, costPerPallet, availableDates]);

  const receivingFiltered = useMemo(() => {
      return receivingRecords.filter(r => r.date >= startDate && r.date <= endDate).sort((a,b) => a.date.localeCompare(b.date));
  }, [receivingRecords, startDate, endDate]);

  const totalStorageCost = storageStats.reduce((sum, item) => sum + item.cost, 0);
  const totalReceivingCost = receivingFiltered.reduce((sum, item) => sum + item.subtotal, 0);
  const totalCombinedCost = totalStorageCost + totalReceivingCost;

  const warehouses = Object.keys(warehouseMap).sort();
  const needsAction = currentUser?.role === 'admin' ? billingLocks.some(l => l.status === 'confirmed') : billingLocks.some(l => l.status === 'locked');

  const handleLockBilling = () => {
      if (hasOverlapCompleted) return showToast('此區間包含已結帳完成之紀錄，無法重複結帳！', 'error');
      const newLockId = `${startDate}_${endDate}`;
      const newLock = {
          id: newLockId, startDate, endDate,
          storageAmount: totalStorageCost, receivingAmount: totalReceivingCost, totalAmount: totalCombinedCost,
          status: 'locked', confirmedBy: null, invoiceFiles: [],
          rate: costPerPallet,
          storageDetails: storageStats,
          receivingDetails: receivingFiltered
      };
      updateBillingLock(newLockId, newLock);
      showToast('已鎖定指定區間結帳費用，可至「結帳管理看板」查看進度');
  };

  const doBillingExport = () => {
    if (!window.XLSX) return showToast('Excel 匯出模組載入中，請稍候再試！', 'error');
    const isStorage = billingSubTab === 'storage';
    
    if (isStorage) {
        const aoaData = [];
        const row1 = ['倉別'];
        warehouses.forEach(wh => { row1.push(getWhNameText(wh)); row1.push(''); });
        row1.push('合計'); row1.push('');
        aoaData.push(row1);

        const row2 = ['日期'];
        warehouses.forEach(wh => { row2.push('板數'); row2.push('金額'); });
        row2.push('板數'); row2.push('金額');
        aoaData.push(row2);

        let grandTotalUnit = 0, grandTotalCost = 0;
        const whTotals = {};
        warehouses.forEach(wh => whTotals[wh] = { unit: 0, cost: 0 });

        storageStats.forEach(day => {
            const dataRow = [day.date];
            warehouses.forEach(wh => {
                const units = day.details[wh] || 0;
                const cost = Math.round(units * costPerPallet);
                dataRow.push(units); dataRow.push(cost);
                whTotals[wh].unit += units; whTotals[wh].cost += cost;
            });
            dataRow.push(day.pallets); dataRow.push(day.cost);
            grandTotalUnit += day.pallets; grandTotalCost += day.cost;
            aoaData.push(dataRow);
        });

        const totalRow = ['區間合計'];
        warehouses.forEach(wh => { totalRow.push(whTotals[wh].unit); totalRow.push(whTotals[wh].cost); });
        totalRow.push(grandTotalUnit); totalRow.push(grandTotalCost);
        aoaData.push(totalRow);

        const ws = window.XLSX.utils.aoa_to_sheet(aoaData);
        const merges = [];
        let colIndex = 1;
        
        const wscols = [{wch: 12}];
        warehouses.forEach(() => { 
            merges.push({ s: { r: 0, c: colIndex }, e: { r: 0, c: colIndex + 1 } }); 
            wscols.push({wch: 12}); wscols.push({wch: 12});
            colIndex += 2; 
        });
        merges.push({ s: { r: 0, c: colIndex }, e: { r: 0, c: colIndex + 1 } });
        wscols.push({wch: 12}); wscols.push({wch: 12});

        ws['!merges'] = merges;
        ws['!cols'] = wscols;

        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, "工作表1");
        window.XLSX.writeFile(wb, `結帳報表_倉租費_${startDate}_${endDate}.xlsx`);
    } else {
        const exportData = receivingFiltered.map(r => ({
            '進貨日': r.date, '車型': r.truckType, '車趟': r.route, '趟數': r.trips,
            '運費': r.freight, '翻板費': r.palletFee, '小計': r.subtotal
        }));
        if (exportData.length > 0) {
           exportData.push({ '進貨日': '區間合計', '車型': '', '車趟': '', '趟數': '', '運費': '', '翻板費': '', '小計': totalReceivingCost });
        }
        const ws = window.XLSX.utils.json_to_sheet(exportData);
        ws['!cols'] = Array(7).fill({wch: 12}); 
        
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, "上收費");
        window.XLSX.writeFile(wb, `結帳報表_上收費_${startDate}_${endDate}.xlsx`);
    }
  };

  const dataColWidth = `${84 / (warehouses.length * 2 + 2)}%`;
  const canViewCost = currentUser.role === 'admin';

  return (
    <div className="space-y-4 animate-fade-in text-center">
      {showBillingModal && <BillingManagerModal onClose={() => setShowBillingModal(false)} />}
      
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 transition-all duration-500 ${isGreyedOut ? 'grayscale opacity-75 pointer-events-none' : ''}`}>
         <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-lg p-6 text-white text-left relative overflow-hidden flex flex-col justify-center">
            <DollarSign className="absolute -right-4 -bottom-4 w-32 h-32 text-white opacity-5" />
            <p className="text-slate-300 text-sm font-bold mb-1">倉租費總計 (Storage)</p>
            <h3 className="text-3xl font-black">${totalStorageCost.toLocaleString('en-US', {maximumFractionDigits: 0})}</h3>
            {currentUser.role === 'admin' && <p className="text-xs text-slate-400 mt-2">費率: {costPerPallet} 元/板</p>}
         </div>
         <div className="bg-gradient-to-br from-indigo-800 to-purple-900 rounded-2xl shadow-lg p-6 text-white text-left relative overflow-hidden flex flex-col justify-center">
            <Truck className="absolute -right-4 -bottom-4 w-32 h-32 text-white opacity-5" />
            <p className="text-indigo-200 text-sm font-bold mb-1">上收費總計 (Receiving)</p>
            <h3 className="text-3xl font-black">${totalReceivingCost.toLocaleString('en-US', {maximumFractionDigits: 0})}</h3>
         </div>
         <div className="bg-gradient-to-br from-emerald-600 to-teal-800 rounded-2xl shadow-lg p-6 text-white text-left relative overflow-hidden flex flex-col justify-center transform hover:scale-[1.02] transition-transform">
            <CheckCircle className="absolute -right-4 -bottom-4 w-32 h-32 text-white opacity-10" />
            <p className="text-emerald-100 text-sm font-bold mb-1 uppercase tracking-wider">區間總計費用 (Total)</p>
            <h3 className="text-4xl font-black text-white">${totalCombinedCost.toLocaleString('en-US', {maximumFractionDigits: 0})}</h3>
            <p className="text-xs text-emerald-200 mt-2 bg-black/20 self-start px-2 py-1 rounded inline-block">期間: {startDate} ~ {endDate}</p>
         </div>
      </div>

      <div className="flex flex-col xl:flex-row items-center bg-white p-3 rounded-xl shadow-sm border border-gray-200 gap-4">
        <div className="flex flex-wrap gap-4 items-center justify-center xl:justify-start flex-1 w-full xl:w-auto px-2">
          <div className="flex items-center space-x-3">
            <Calendar className="text-blue-500" />
            <div className="flex items-center space-x-2 bg-white rounded-lg p-1 border border-gray-300 shadow-sm h-10">
              <input type="date" className="bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-700 py-1 px-2 text-center cursor-pointer hover:bg-gray-50 transition-colors" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <span className="text-gray-400 font-medium">至</span>
              <input type="date" className="bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-700 py-1 px-2 text-center cursor-pointer hover:bg-gray-50 transition-colors" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="hidden md:block h-6 w-px bg-gray-200"></div>
          
          {canViewCost && (
            <div className="flex items-center space-x-3 h-10 bg-white rounded-lg px-4 border border-gray-200 shadow-sm">
              <Settings className="text-blue-500" size={16}/>
              <label className="text-sm font-bold text-gray-600">板數單價 (元/板):</label>
              {currentUser.role === 'admin' ? (
                <input type="number" className="border-b border-gray-300 w-16 text-center font-black text-blue-700 focus:outline-none focus:border-blue-500 bg-transparent py-1" value={draftCost} onChange={(e) => setDraftCost(e.target.value)} onBlur={commitCost} onKeyDown={(e) => e.key === 'Enter' && commitCost()} step="0.1" />
              ) : <div className="w-16 text-center font-black text-gray-500 bg-gray-50 rounded border border-gray-200">{costPerPallet}</div>}
            </div>
          )}

          {currentUser.role === 'admin' && !currentLock && !hasOverlapCompleted && totalCombinedCost > 0 && (
             <button onClick={handleLockBilling} className="ml-2 bg-amber-500 hover:bg-amber-600 text-white font-bold py-1.5 px-4 rounded-lg text-sm transition-shadow shadow-sm shadow-amber-500/20 flex items-center h-10">
                <LockIcon size={14} className="mr-1.5" /> 鎖定此區間結帳
             </button>
          )}
        </div>
        <div className="shrink-0 flex flex-wrap justify-end w-full xl:w-auto px-2 gap-2 ml-auto">
          <button onClick={() => setShowBillingModal(true)} className="relative flex items-center justify-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 h-10 rounded-lg text-sm font-bold transition-shadow shadow-sm shadow-indigo-600/20 w-full sm:w-auto">
              <FileText size={14} /> <span>結帳查看看板</span>
              {needsAction && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border border-white"></span></span>}
          </button>
          <button onClick={doBillingExport} className="flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 h-10 rounded-lg text-sm font-bold transition-shadow shadow-sm shadow-emerald-600/20 w-full sm:w-auto">
            <Download size={14} /> <span>匯出 Excel</span>
          </button>
        </div>
      </div>

      {hasOverlapCompleted && (
          <div className="bg-rose-50 border-l-4 border-rose-500 p-3 rounded-r-xl shadow-sm flex items-center justify-center mx-auto animate-fade-in">
              <AlertTriangle className="mr-3 text-rose-500 shrink-0" size={20} />
              <div className="text-rose-800 text-left font-bold text-sm">
                  警告：目前選擇的日期區間包含已被鎖定且結帳完成之歷史紀錄，為防止帳務重複，本畫面已轉為唯讀模式。
              </div>
          </div>
      )}

      <div className="flex border-b border-gray-200 mt-6">
        <button onClick={() => setBillingSubTab('storage')} className={`px-8 py-3 text-sm font-bold border-b-2 transition-colors ${billingSubTab === 'storage' ? 'border-blue-600 text-blue-700 bg-white shadow-[0_-2px_4px_rgba(0,0,0,0.02)]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
          倉租費明細 (Storage)
        </button>
        <button onClick={() => setBillingSubTab('receiving')} className={`px-8 py-3 text-sm font-bold border-b-2 transition-colors ${billingSubTab === 'receiving' ? 'border-indigo-600 text-indigo-700 bg-white shadow-[0_-2px_4px_rgba(0,0,0,0.02)]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
          上收費明細 (Receiving)
        </button>
      </div>

      <div className={`bg-white rounded-b-xl rounded-tr-xl shadow-sm border border-t-0 border-gray-200 overflow-hidden transition-all duration-500 ${isGreyedOut ? 'grayscale opacity-75' : ''}`}>
        {billingSubTab === 'storage' ? (
           <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
             <table className="min-w-full divide-y divide-gray-200 text-center table-fixed">
               <thead className="bg-white sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                 <tr>
                   <th rowSpan="2" className="w-[16%] px-2 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider border-r border-b border-gray-200 align-middle">日期</th>
                   {warehouses.map(wh => (
                     <th key={wh} colSpan="2" className="px-2 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider border-r border-b border-gray-200 align-middle">
                       <WhBadge whCode={wh} />
                     </th>
                   ))}
                   <th colSpan="2" className="px-2 py-3 text-center text-xs font-bold text-gray-800 uppercase tracking-wider border-b border-gray-200 align-middle bg-rose-50">合計</th>
                 </tr>
                 <tr>
                   {warehouses.map(wh => (
                     <React.Fragment key={`${wh}-sub`}>
                       <th style={{ width: dataColWidth }} className="px-2 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider border-r border-gray-200 align-middle">板數</th>
                       <th style={{ width: dataColWidth }} className="px-2 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider border-r border-gray-200 align-middle">金額</th>
                     </React.Fragment>
                   ))}
                   <th style={{ width: dataColWidth }} className="px-2 py-3 text-center text-xs font-bold text-gray-800 uppercase tracking-wider border-r border-gray-200 align-middle bg-rose-50">板數</th>
                   <th style={{ width: dataColWidth }} className="px-2 py-3 text-center text-xs font-bold text-gray-800 uppercase tracking-wider align-middle bg-rose-50">金額</th>
                 </tr>
               </thead>
               <tbody className="bg-white divide-y divide-gray-200">
                 {storageStats.length > 0 ? storageStats.map(day => (
                   <tr key={day.date} className="transition-colors hover:bg-blue-50/30">
                      <td className="px-2 py-4 whitespace-nowrap text-sm font-bold text-gray-900 border-r border-gray-200 align-middle text-center bg-gray-50/30">
                        {day.date}
                      </td>
                      {warehouses.map(wh => {
                        const units = day.details[wh] || 0;
                        const cost = Math.round(units * costPerPallet);
                        return (
                          <React.Fragment key={`${day.date}-${wh}`}>
                            <td className="px-2 py-4 whitespace-nowrap text-sm text-center text-gray-700 font-semibold border-r border-gray-100">{units.toLocaleString()}</td>
                            <td className="px-2 py-4 whitespace-nowrap text-sm text-center font-bold border-r border-gray-200 text-emerald-600">
                              ${cost.toLocaleString('en-US', {maximumFractionDigits: 0})}
                            </td>
                          </React.Fragment>
                        );
                      })}
                      <td className="px-2 py-4 whitespace-nowrap text-sm text-center text-rose-800 font-black border-r border-gray-100 bg-rose-50/30">
                        {day.pallets.toLocaleString()}
                      </td>
                      <td className="px-2 py-4 whitespace-nowrap text-sm text-center font-black bg-rose-50/30 text-rose-600">
                        ${day.cost.toLocaleString('en-US', {maximumFractionDigits: 0})}
                      </td>
                   </tr>
                 )) : (
                   <tr><td colSpan={warehouses.length * 2 + 3} className="px-6 py-12 text-center text-gray-400 font-medium">請選擇日期區間以查看資料</td></tr>
                 )}
               </tbody>
             </table>
           </div>
        ) : (
           <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
             <table className="min-w-full divide-y divide-gray-200 text-center">
               <thead className="bg-white sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                 <tr>
                   {['進貨日', '車型', '車趟', '趟數', '運費', '翻板費', '小計'].map(h => (
                      <th key={h} className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                   ))}
                 </tr>
               </thead>
               <tbody className="bg-white divide-y divide-gray-100">
                 {receivingFiltered.length > 0 ? receivingFiltered.map((row, idx) => (
                    <tr key={`${row.date}-${idx}`} className="transition-colors hover:bg-indigo-50/30">
                       <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{row.date}</td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-mono bg-gray-50/50">{row.truckType}</td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-semibold">{row.route}</td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.trips}</td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-500">${row.freight.toLocaleString()}</td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-500">${row.palletFee.toLocaleString()}</td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-indigo-600 bg-indigo-50/20">${row.subtotal.toLocaleString()}</td>
                    </tr>
                 )) : (
                    <tr>
                       <td colSpan="7" className="px-6 py-16 text-center">
                           <FilePlus className="mx-auto text-gray-300 mb-3" size={32} />
                           <p className="text-gray-500 font-bold mb-1">查無此區間之上收費用紀錄</p>
                           <p className="text-xs text-gray-400">請由右上角【匯入上收費】上傳對應格式之 Excel 檔案</p>
                       </td>
                    </tr>
                 )}
               </tbody>
             </table>
           </div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [fbUser, setFbUser] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    const initAuth = async () => {
      try { await signInAnonymously(auth); } catch(e) { console.error("Firebase 授權失敗", e); }
    };
    initAuth();
    
    if (auth) {
       const unsubscribe = onAuthStateChanged(auth, (user) => {
         setFbUser(user);
         setIsConnected(!!user);
       });
       return () => unsubscribe();
    }
  }, []);

  // 全新架構的 Collection Hooks (加上 usersLoading 狀態避免提早執行)
  const { list: users, loading: usersLoading, addOrUpdate: updateUser, remove: removeUser } = useCollectionData('users', fbUser);
  const { list: billingLocks, addOrUpdate: updateBillingLock, remove: removeBillingLock } = useCollectionData('billingLocks', fbUser);
  const { list: importedFiles, addOrUpdate: updateImportedFile } = useCollectionData('importedFiles', fbUser);
  const { list: receivingRecords } = useCollectionData('receivingRecords', fbUser);
  const { list: data } = useCollectionData('inventoryData', fbUser);
  
  const [settings, setSettings] = useDocData('appSettings', defaultSettings, fbUser);

  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [regForm, setRegForm] = useState({ username: '', password: '', name: '' });
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: null });

  // 修正：初次執行時，若無帳號且確定已載入完畢，則自動寫入管理員
  useEffect(() => {
    if (isConnected && !usersLoading && users.length === 0) {
      updateUser('reyi', { username: 'reyi', password: '8963', name: '管理員', role: 'admin', loginCount: 0, status: 'approved', permittedTabs: ['inventory', 'inout', 'pallets', 'billing'], permittedSettings: ['pcs', 'cost'] })
        .catch(err => console.error("寫入管理員失敗:", err));
    }
  }, [isConnected, usersLoading, users.length]);

  const { vendorName, warehouseMap, pcsPerPallet, costPerPallet, customLogo } = settings || defaultSettings;
  const getWhNameText = (code) => warehouseMap?.[code] ? warehouseMap[code].name : `${code}倉`;

  // 提前宣告 displayLogoSrc，以便 useEffect 使用
  const displayLogoSrc = customLogo || "日翊.PNG";

  // 🌟 新增：動態同步網頁標題與 Favicon
  useEffect(() => {
    document.title = `${vendorName} 廠商協作平台`;
    
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = displayLogoSrc;
  }, [vendorName, displayLogoSrc]);

  const [isEditingVendor, setIsEditingVendor] = useState(false);
  const [draftVendorName, setDraftVendorName] = useState(vendorName);
  const [showWhSettings, setShowWhSettings] = useState(false);
  const [draftWhMap, setDraftWhMap] = useState({});

  useEffect(() => { setDraftVendorName(settings?.vendorName || ''); }, [settings?.vendorName]);

  const commitVendorName = () => {
      if (currentUser?.role !== 'admin') return;
      setSettings(s => ({ ...s, vendorName: draftVendorName }));
      setIsEditingVendor(false);
  };
  const commitWhMap = () => {
      if (currentUser?.role !== 'admin') return;
      setSettings(s => ({ ...s, warehouseMap: draftWhMap }));
      setShowWhSettings(false);
  };

  const [activeTab, setActiveTab] = useState('inventory');
  const fileInputRef = useRef(null);
  const receivingFileInputRef = useRef(null);
  const logoInputRef = useRef(null);
  const [toast, setToast] = useState(null);

  const [newWhCode, setNewWhCode] = useState('');
  const [newWhName, setNewWhName] = useState('');
  const [newWhColor, setNewWhColor] = useState('gray');

  useEffect(() => {
    if (!window.XLSX) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (!users || !Array.isArray(users)) return setLoginError('系統尚未就緒，請稍後重試');
    
    const user = users.find(u => u.username === loginForm.username && u.password === loginForm.password);
    if (!user) return setLoginError('帳號或密碼輸入錯誤，請重新確認');
    if (user.status !== 'approved') return setLoginError('帳號尚在審核中，請聯繫管理員');
    
    updateUser(user.username, { ...user, loginCount: (user.loginCount || 0) + 1 });
    setCurrentUser(user);
    setLoginError('');
    
    if (user.role !== 'admin' && user.permittedTabs.length > 0) setActiveTab(user.permittedTabs[0]);
    else setActiveTab('inventory');
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (!regForm.username || !regForm.password || !regForm.name) return setRegError('請填寫完整資訊');
    if (users && users.some(u => u.username === regForm.username)) return setRegError('帳號已存在，請更換帳號名稱');
    
    updateUser(regForm.username, { ...regForm, role: 'member', loginCount: 0, status: 'pending', permittedTabs: [], permittedSettings: [] });
    setRegSuccess('帳號申請已送出，請等待管理員核可');
    setRegError('');
    setRegForm({ username: '', password: '', name: '' });
    setTimeout(() => { setAuthMode('login'); setRegSuccess(''); }, 3000);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLoginForm({ username: '', password: '' });
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleLogoUpload = (e) => {
     const file = e.target.files[0];
     if (!file) return;
     if (file.size > 500 * 1024) return showToast('Logo 圖檔請勿超過 500KB', 'error');
     
     const reader = new FileReader();
     reader.onload = (ev) => {
         setSettings(s => ({ ...s, customLogo: ev.target.result }));
         showToast('封面小圖示 (Logo) 已成功更新', 'success');
     };
     reader.readAsDataURL(file);
     e.target.value = '';
  };

  const handleExportExcel = (exportData, filename) => {
    if (!window.XLSX) return showToast('Excel 匯出模組載入中，請稍候再試！', 'error');
    const ws = window.XLSX.utils.json_to_sheet(exportData);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "報表資料");
    window.XLSX.writeFile(wb, `${filename}_${new Date().getTime()}.xlsx`);
  };

  const formatROCtoAD = (rocStr) => {
    if (!rocStr || rocStr.length !== 7) return rocStr;
    const y = parseInt(rocStr.substring(0, 3), 10) + 1911;
    const m = rocStr.substring(3, 5);
    const d = rocStr.substring(5, 7);
    return `${y}-${m}-${d}`;
  };

  const handleReceivingUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    if (!window.XLSX) return showToast('Excel 解析模組載入中，請稍候再試！', 'error');
    const XLSX = window.XLSX;

    let newRecRecords = [];
    let recSuccessCount = 0;
    let errorCount = 0;

    for (const file of files) {
      try {
        const fileRocYearMatch = file.name.match(/(\d{2,3})年(\d{1,2})月/);
        const fileRocYear = fileRocYearMatch ? parseInt(fileRocYearMatch[1], 10) + 1911 : null;
        const fileMonth = fileRocYearMatch ? parseInt(fileRocYearMatch[2], 10) : null;

        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (jsonData.length === 0) { errorCount++; continue; }

        if (jsonData[0]['進貨日'] !== undefined || jsonData[0]['車型'] !== undefined) {
           let hasValidData = false;
           jsonData.forEach(row => {
               if (row['進貨日']) {
                   hasValidData = true;
                   const dateRaw = String(row['進貨日']).trim();
                   let dateStr = dateRaw;
                   const cnDateMatch = dateRaw.match(/^(\d{1,2})月(\d{1,2})日$/);
                   if (cnDateMatch) {
                     const rowMonth = parseInt(cnDateMatch[1], 10);
                     const rowDay = parseInt(cnDateMatch[2], 10);
                     const baseYear = fileRocYear || new Date().getFullYear();
                     const year = (fileMonth !== null && rowMonth > fileMonth) ? baseYear - 1 : baseYear;
                     dateStr = `${year}-${String(rowMonth).padStart(2,'0')}-${String(rowDay).padStart(2,'0')}`;
                   } else if (!isNaN(dateRaw) && Number(dateRaw) > 10000) {
                     const d = XLSX.SSF.parse_date_code(Number(dateRaw));
                     dateStr = `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
                   }
                   newRecRecords.push({
                       date: dateStr, truckType: String(row['車型'] || '').trim(), route: String(row['車趟'] || '').trim(),
                       trips: Number(row['趟數']) || 0, freight: Number(row['運費']) || 0, palletFee: Number(row['翻板費']) || 0, subtotal: Number(row['小計']) || 0
                   });
               }
           });
           if (hasValidData) recSuccessCount++;
           else errorCount++;
        } else {
           errorCount++;
        }
      } catch (err) { errorCount++; }
    }

    if (recSuccessCount > 0) {
       showToast(`正在將 ${recSuccessCount} 筆上收費明細同步至雲端...`, 'success');
       const datesToReplaceRec = new Set(newRecRecords.map(r => r.date));
       
       const oldRecs = receivingRecords.filter(r => datesToReplaceRec.has(r.date));
       const deleteChunks = chunkArray(oldRecs, 400);
       for (let chunk of deleteChunks) {
         const batch = writeBatch(db);
         chunk.forEach(d => batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'receivingRecords', d._docId)));
         await batch.commit();
       }

       const insertChunks = chunkArray(newRecRecords, 400);
       for (let chunk of insertChunks) {
         const batch = writeBatch(db);
         chunk.forEach((item, index) => {
           const safeRoute = item.route.replace(/\//g, '-');
           const docId = `${item.date}_${safeRoute}_${index}`;
           batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'receivingRecords', docId), item);
         });
         await batch.commit();
       }
       showToast(`匯入成功！已更新上收費單據。`, 'success');
    } else if (errorCount > 0) {
       showToast(`匯入失敗，請確認檔案是否為「上收費用結帳」格式。`, 'error');
    }

    if (receivingFileInputRef.current) receivingFileInputRef.current.value = '';
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    if (!window.XLSX) return showToast('Excel 解析模組載入中，請稍候再試！', 'error');
    const XLSX = window.XLSX;

    let newParsedData = [];
    let successCount = 0;
    let errorCount = 0;
    let datesToRecord = [];

    for (const file of files) {
      const dateMatch = file.name.match(/(\d{7})/);
      if (!dateMatch) { errorCount++; continue; }
      
      const rawDate = dateMatch[1];
      const adDate = formatROCtoAD(rawDate);

      try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        let hasValidData = false;
        
        // 新增：於匯入時即進行同批號資料的合併計算加總，大幅減少寫入的 Firebase Document 數量
        const aggregatedData = new Map();

        jsonData.forEach(row => {
          if (row['廠區代號'] !== undefined && row['廠區代號'] !== '') {
            hasValidData = true;
            
            const wh = String(row['廠區代號']).trim();
            const itemCode = String(row['商品代號'] || '').trim();
            const batch = String(row['入倉批號'] || '').trim();
            const stockVal = parseInt(row['庫存數量'], 10) || 0;
            
            const key = `${wh}_${itemCode}_${batch}`;

            if (aggregatedData.has(key)) {
                aggregatedData.get(key).stock += stockVal;
            } else {
                aggregatedData.set(key, {
                  rawDate: rawDate, date: adDate,
                  wh, itemCode,
                  itemName: String(row['品名'] || '').trim(), category: String(row['大分類'] || '').trim(),
                  stock: stockVal, expDate: String(row['到期日'] || '').trim(),
                  lastStoreDate: String(row['最後到店日'] || '').trim(), batch
                });
            }
          }
        });

        if (hasValidData) {
          successCount++;
          if (!datesToRecord.includes(adDate)) datesToRecord.push(adDate);
          // 將合併完成的當日資料推入寫入陣列
          newParsedData.push(...Array.from(aggregatedData.values()));
        } else {
          errorCount++;
        }
      } catch (err) { errorCount++; }
    }

    if (successCount > 0) {
      showToast(`正在將庫存明細合併計算並同步至雲端，請稍候...`, 'success');
      const datesToReplace = new Set(newParsedData.map(d => d.date));
      
      const oldDocs = data.filter(d => datesToReplace.has(d.date));
      const deleteChunks = chunkArray(oldDocs, 400);
      for (let chunk of deleteChunks) {
        const batch = writeBatch(db);
        chunk.forEach(d => batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'inventoryData', d._docId)));
        await batch.commit();
      }

      const insertChunks = chunkArray(newParsedData, 400);
      for (let chunk of insertChunks) {
        const batch = writeBatch(db);
        chunk.forEach((item, index) => {
          const safeItemCode = item.itemCode.replace(/\//g, '-');
          const safeBatch = item.batch.replace(/\//g, '-');
          const docId = `${item.date}_${item.wh}_${safeItemCode}_${safeBatch}_${index}`;
          batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'inventoryData', docId), item);
        });
        await batch.commit();
      }

      datesToRecord.forEach(date => updateImportedFile(date, { date }));
      showToast(`匯入完成！成功合併並更新 ${successCount} 份庫存檔案。`, 'success');
    } else if (errorCount > 0) {
      showToast(`匯入失敗，請確認檔案名稱是否包含7碼日期 且為庫存格式。`, 'error');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const availableDates = useMemo(() => [...new Set((data||[]).map(d => d.date))].sort(), [data]);

  const batchFirstAppearance = useMemo(() => {
    const map = {};
    (data||[]).forEach(d => {
      const key = `${d.wh}-${d.itemCode}-${d.batch}`;
      if (!map[key] || d.date < map[key]) map[key] = d.date;
    });
    return map;
  }, [data]);

  const tabsConfig = [
    { id: 'inventory', icon: Package, label: '商品庫存明細' },
    { id: 'inout', icon: ArrowRightLeft, label: '庫存進出紀錄' },
    { id: 'pallets', icon: Layers, label: '庫存棧板統計' },
    { id: 'billing', icon: DollarSign, label: '結帳報表' },
  ];

  const visibleTabs = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return tabsConfig;
    return tabsConfig.filter(t => currentUser.permittedTabs.includes(t.id));
  }, [currentUser]);

  const showConfirm = (message, onConfirm) => {
    setConfirmDialog({ isOpen: true, message, onConfirm });
  };

  const contextValue = {
    data: data || [], receivingRecords: receivingRecords || [], availableDates, batchFirstAppearance, warehouseMap: warehouseMap || {}, getWhNameText,
    pcsPerPallet, costPerPallet, currentUser, setSettings,
    billingLocks: billingLocks || [], updateBillingLock, removeBillingLock, showToast, showConfirm, handleExportExcel,
    users: users || [], updateUser, removeUser, setCurrentUser, isConnected, tabsConfig
  };

  const handleLogoFallback = (e) => {
      e.target.onerror = null; 
      e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="white" width="100" height="100"/><text x="50" y="65" font-size="40" text-anchor="middle" font-weight="bold" fill="%231d4ed8">U</text></svg>';
  };

  if (!currentUser) {
    return (
      <AppContext.Provider value={contextValue}>
        <div className="min-h-screen relative overflow-hidden bg-white flex items-center justify-center font-sans">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-50 via-white to-slate-100 z-0"></div>
          <div className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] bg-gradient-to-br from-slate-200/50 to-blue-50/40 rounded-full mix-blend-multiply blur-[80px] opacity-70 animate-pulse z-0"></div>
          <div className="absolute bottom-[-15%] right-[-10%] w-[50vw] h-[50vw] bg-gradient-to-tl from-blue-100/50 to-slate-300/30 rounded-[100px] rotate-[35deg] mix-blend-multiply blur-[100px] opacity-80 z-0"></div>
          <div className="absolute top-[15%] right-[15%] w-[18vw] h-[18vw] bg-gradient-to-tr from-white/90 to-slate-100/60 border border-white/80 rounded-full shadow-[0_20px_60px_rgba(0,0,0,0.06)] backdrop-blur-2xl z-0 transform rotate-12"></div>
          <div className="absolute bottom-[20%] left-[10%] w-[22vw] h-[12vw] bg-gradient-to-r from-slate-100/70 to-white/50 border border-white/80 rounded-[3rem] shadow-[0_15px_40px_rgba(0,0,0,0.05)] backdrop-blur-xl z-0 transform -rotate-6"></div>

          <div className="relative z-10 w-full max-w-[420px] m-4 perspective-1000">
            <div className="bg-white/50 backdrop-blur-3xl border border-white/80 p-12 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(100,110,140,0.15),_0_0_0_1px_rgba(255,255,255,0.8)_inset] transition-all duration-700 hover:shadow-[0_30px_80px_-20px_rgba(100,110,140,0.2)]">
              <div className="text-center mb-10">
                <div className="inline-flex justify-center items-center mb-5 relative">
                   <img src={displayLogoSrc} alt="Logo" className="w-20 h-20 object-contain rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.1)] relative z-10 border border-white/90 bg-white/80 p-2.5 backdrop-blur-md" onError={handleLogoFallback} />
                </div>
                <h1 className="text-[28px] font-black text-slate-800 tracking-tight leading-tight">廠商協作平台</h1>
                <p className="text-[10px] font-bold text-slate-400 tracking-[0.25em] mt-2 uppercase">Enterprise Portal</p>
              </div>

              {authMode === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 text-left">Account</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 transition-colors" size={18} />
                      <input 
                        type="text" 
                        className={`w-full bg-white/70 border ${loginError ? 'border-rose-300 focus:ring-rose-400 bg-rose-50/50' : 'border-slate-200/80 focus:ring-slate-300 focus:border-slate-300'} rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-opacity-30 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.01)_inset]`}
                        placeholder="請輸入帳號" value={loginForm.username} onChange={(e) => { setLoginForm({...loginForm, username: e.target.value}); setLoginError(''); }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 text-left">Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 transition-colors" size={18} />
                      <input 
                        type="password" 
                        className={`w-full bg-white/70 border ${loginError ? 'border-rose-300 focus:ring-rose-400 bg-rose-50/50' : 'border-slate-200/80 focus:ring-slate-300 focus:border-slate-300'} rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-opacity-30 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.01)_inset]`}
                        placeholder="請輸入密碼" value={loginForm.password} onChange={(e) => { setLoginForm({...loginForm, password: e.target.value}); setLoginError(''); }}
                      />
                    </div>
                  </div>
                  
                  {loginError && <div className="text-xs font-bold text-rose-600 text-center animate-fade-in bg-rose-50/80 py-2.5 rounded-xl border border-rose-100 flex items-center justify-center"><AlertCircle size={14} className="mr-1.5"/>{loginError}</div>}
                  
                  <button type="submit" disabled={!isConnected} className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white rounded-2xl py-4 text-sm font-black tracking-wide shadow-[0_10px_20px_-10px_rgba(15,23,42,0.4)] transition-all transform hover:-translate-y-0.5 border border-slate-700 disabled:transform-none">
                    {isConnected ? '登 入 LOGIN' : '系統連線中...'}
                  </button>
                  
                  <div className="text-center pt-6 border-t border-slate-200/60">
                    <p className="text-xs font-bold text-slate-400">
                      沒有帳號？ <button type="button" onClick={() => {setAuthMode('register'); setLoginError('');}} className="text-slate-600 hover:text-slate-800 transition-colors underline decoration-slate-300 underline-offset-4 ml-1">立即申請</button>
                    </p>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-6 animate-fade-in">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 text-left">New Account</label>
                    <div className="relative group">
                      <UserPlus className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 transition-colors" size={18} />
                      <input 
                        type="text" className={`w-full bg-white/70 border ${regError === '帳號已存在，請更換帳號名稱' ? 'border-rose-300 focus:ring-rose-400' : 'border-slate-200/80 focus:ring-slate-300'} rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-opacity-30 transition-all`}
                        placeholder="請設定帳號" value={regForm.username} onChange={(e) => { setRegForm({...regForm, username: e.target.value}); setRegError(''); }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 text-left">Set Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 transition-colors" size={18} />
                      <input 
                        type="password" className="w-full bg-white/70 border border-slate-200/80 focus:border-slate-300 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-slate-300 focus:ring-opacity-30 transition-all"
                        placeholder="請設定密碼" value={regForm.password} onChange={(e) => { setRegForm({...regForm, password: e.target.value}); setRegError(''); }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 text-left">Display Name</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 transition-colors" size={18} />
                      <input 
                        type="text" className="w-full bg-white/70 border border-slate-200/80 focus:border-slate-300 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-slate-300 focus:ring-opacity-30 transition-all"
                        placeholder="請輸入您的姓名" value={regForm.name} onChange={(e) => { setRegForm({...regForm, name: e.target.value}); setRegError(''); }}
                      />
                    </div>
                  </div>
                  
                  {regError && <div className="text-xs font-bold text-rose-600 text-center animate-fade-in bg-rose-50/80 py-2.5 rounded-xl border border-rose-100 flex items-center justify-center"><AlertCircle size={14} className="mr-1.5"/>{regError}</div>}
                  {regSuccess && <div className="text-xs font-bold text-emerald-600 text-center animate-fade-in bg-emerald-50/80 py-2.5 rounded-xl border border-emerald-100 flex items-center justify-center"><CheckCircle size={14} className="mr-1.5"/>{regSuccess}</div>}
                  
                  <button type="submit" disabled={!isConnected} className="w-full bg-slate-400 hover:bg-slate-500 disabled:bg-slate-300 text-white rounded-2xl py-4 text-sm font-black tracking-wide shadow-[0_10px_20px_-10px_rgba(148,163,184,0.5)] transition-all transform hover:-translate-y-0.5 border border-transparent">
                    {isConnected ? '送出申請 APPLY' : '系統連線中...'}
                  </button>
                  
                  <div className="text-center pt-6 border-t border-slate-200/60">
                    <button type="button" onClick={() => {setAuthMode('login'); setRegError(''); setRegSuccess('');}} className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">
                      ← 返回登入 (Return)
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </AppContext.Provider>
    );
  }

  return (
    <AppContext.Provider value={contextValue}>
      <div className="min-h-screen bg-[#fafafc] flex flex-col font-sans text-center relative">
        <input type="file" accept=".png, .jpg, .jpeg" className="hidden" ref={logoInputRef} onChange={handleLogoUpload} />

        {toast && (
          <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-down">
            <div className={`flex items-center px-6 py-3 rounded-full shadow-2xl text-sm font-bold backdrop-blur-md ${toast.type === 'success' ? 'bg-emerald-600/95 text-white border border-emerald-400' : 'bg-rose-600/95 text-white border border-rose-400'}`}>
              {toast.type === 'success' ? <CheckCircle size={18} className="mr-2" /> : <AlertTriangle size={18} className="mr-2" />}
              {toast.message}
            </div>
          </div>
        )}

        {confirmDialog.isOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in text-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-6 transform transition-all border border-rose-100">
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="text-rose-500" size={32} />
              </div>
              <h3 className="text-xl font-black text-gray-800 mb-2">請確認操作</h3>
              <p className="text-sm font-medium text-gray-500 mb-6">{confirmDialog.message}</p>
              <div className="flex justify-center space-x-3">
                <button onClick={() => setConfirmDialog({ isOpen: false, message: '', onConfirm: null })} className="flex-1 bg-gray-100 text-gray-600 hover:bg-gray-200 px-4 py-3 rounded-xl text-sm font-bold transition-colors">取消</button>
                <button onClick={() => { if(confirmDialog.onConfirm) confirmDialog.onConfirm(); setConfirmDialog({ isOpen: false, message: '', onConfirm: null }); }} className="flex-1 bg-rose-500 hover:bg-rose-600 text-white px-4 py-3 rounded-xl text-sm font-bold transition-colors shadow-md shadow-rose-500/20">確定執行</button>
              </div>
            </div>
          </div>
        )}

        {showUserModal && <UserSettingsModal onClose={() => setShowUserModal(false)} />}

        <header className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] text-center">
          <div className="flex flex-col md:flex-row justify-between items-center px-8 py-3 gap-4">
            <div className="flex items-center justify-center space-x-3">
              <div 
                 className={`relative ${currentUser?.role === 'admin' ? 'cursor-pointer group' : ''}`}
                 onClick={() => currentUser?.role === 'admin' && logoInputRef.current && logoInputRef.current.click()}
                 title={currentUser?.role === 'admin' ? "點擊更換封面小圖示" : ""}
              >
                 <img src={displayLogoSrc} alt="Logo" className={`w-12 h-12 object-contain rounded-xl shadow-sm border border-gray-100 bg-white p-1 transition-transform ${currentUser?.role === 'admin' ? 'group-hover:scale-105' : ''}`} onError={handleLogoFallback} />
                 {currentUser?.role === 'admin' && (
                    <div className="absolute inset-0 bg-black/10 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Camera className="text-white drop-shadow-md" size={16} />
                    </div>
                 )}
              </div>
              <div className="text-left">
                <div className="flex items-center space-x-3">
                  <h1 className="text-xl font-black text-gray-900 leading-tight tracking-tight">廠商協作平台</h1>
                  <ConnectionIndicator />
                </div>
                <div className="flex items-center mt-0.5">
                  <span className="text-xs text-blue-600 font-bold tracking-wide mr-1">廠商：</span>
                  {isEditingVendor ? (
                    <input type="text" value={draftVendorName} onChange={(e) => setDraftVendorName(e.target.value)} onBlur={commitVendorName} onKeyDown={(e) => e.key === 'Enter' && commitVendorName()} autoFocus className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-300 rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 w-32 text-center" />
                  ) : (
                    <div className="flex items-center justify-center cursor-pointer hover:bg-blue-50 px-1 -ml-1 rounded group transition-colors" onClick={() => { if(currentUser?.role === 'admin') { setDraftVendorName(vendorName); setIsEditingVendor(true); }}} title={currentUser?.role === 'admin' ? "點擊編輯廠商名稱" : ""}>
                      <span className="text-xs text-blue-600 font-bold tracking-wide">{vendorName}</span>
                      {currentUser?.role === 'admin' && <Edit2 size={10} className="ml-1 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-4">
              <div className="flex items-center justify-center space-x-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 mr-2">
                <button onClick={() => setShowUserModal(true)} className="flex items-center text-sm font-bold text-gray-700 hover:text-indigo-600 transition-colors">
                  <User size={16} className="mr-1.5" />
                  {currentUser.name} {currentUser.role === 'admin' && <Shield size={12} className="ml-1 text-indigo-500" />}
                </button>
                <div className="w-px h-4 bg-gray-300 mx-2"></div>
                <button onClick={handleLogout} className="text-gray-400 hover:text-rose-600 transition-colors flex items-center justify-center" title="登出"><LogOut size={16} /></button>
              </div>

              {currentUser.role === 'admin' && (
                <>
                  <button onClick={() => { setDraftWhMap(warehouseMap); setShowWhSettings(true); }} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100 flex items-center justify-center" title="倉別圖示與名稱設定"><Settings size={20} /></button>
                  <input type="file" multiple accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                  <input type="file" multiple accept=".xlsx, .xls, .csv" className="hidden" ref={receivingFileInputRef} onChange={handleReceivingUpload} />
                  <button onClick={() => receivingFileInputRef.current.click()} className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm shadow-indigo-500/20"><FilePlus size={16} /><span>匯入上收費</span></button>
                  <button onClick={() => fileInputRef.current.click()} className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm shadow-blue-500/20"><UploadCloud size={16} /><span>匯入報表</span></button>
                </>
              )}

              {importedFiles && importedFiles.length > 0 && (
                <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg flex items-center justify-center border border-emerald-200 shadow-inner"><FileSpreadsheet size={14} className="mr-1.5"/>已載入 {importedFiles.length} 日庫存明細</div>
              )}
            </div>
          </div>

          <nav className="flex w-full px-8 bg-white pt-2">
            {visibleTabs.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex-1 flex items-center justify-center space-x-2 px-6 py-3.5 text-sm font-bold transition-colors border-b-2 ${
                  activeTab === item.id ? 'border-blue-600 text-blue-700 bg-blue-50/30' : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <item.icon size={18} className={activeTab === item.id ? 'text-blue-600' : 'text-gray-400'} /><span>{item.label}</span>
              </button>
            ))}
            {visibleTabs.length === 0 && <div className="py-4 text-sm font-bold text-gray-400 w-full text-center">您目前尚無任何報表的查看權限，請聯繫管理員。</div>}
          </nav>
        </header>

        <main className="flex-1 p-8 text-center">
          {(!data || data.length === 0) && currentUser.role === 'admin' ? (
            <div className="h-full min-h-[60vh] flex flex-col items-center justify-center border-2 border-dashed border-blue-200 rounded-[2.5rem] bg-white/60 m-4 animate-fade-in shadow-sm">
              <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-6 shadow-sm mx-auto"><UploadCloud size={40} /></div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">等待報表匯入</h3>
              <p className="text-slate-500 font-medium text-center max-w-md mx-auto leading-relaxed">
                正式環境無預設測試資料。<br/>請點擊右上角「匯入報表」選取 Excel 檔案 (可多選)。<br/>
                <span className="text-xs text-blue-600 font-bold mt-2 block bg-blue-50 px-2 py-1 rounded inline-block">※ 匯入同一日檔案將以後蓋前方式自動更新資料</span><br/>
                <span className="text-xs text-gray-400 mt-1 block">檔案命名範例：1150310.xlsx 或 上收費用結帳範例.xlsx</span>
              </p>
            </div>
          ) : (!data || data.length === 0) && currentUser.role !== 'admin' ? (
            <div className="h-full min-h-[60vh] flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-[2.5rem] bg-gray-50/60 m-4">
               <Layers size={40} className="text-gray-300 mb-4 mx-auto" />
               <h3 className="text-xl font-bold text-gray-500">系統尚無資料</h3>
               <p className="text-gray-400 text-sm mt-2">請等待系統管理員匯入最新報表</p>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto text-center">
              {activeTab === 'inventory' && visibleTabs.some(t=>t.id==='inventory') && <InventoryView />}
              {activeTab === 'inout' && visibleTabs.some(t=>t.id==='inout') && <InOutView />}
              {activeTab === 'pallets' && visibleTabs.some(t=>t.id==='pallets') && <PalletStatsView />}
              {activeTab === 'billing' && visibleTabs.some(t=>t.id==='billing') && <BillingView />}
            </div>
          )}
        </main>

        {showWhSettings && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in text-center">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-left">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="text-lg font-bold text-gray-800 flex items-center"><Settings size={18} className="mr-2 text-blue-600" />倉別圖示與名稱設定</h3>
                <button onClick={() => setShowWhSettings(false)} className="text-gray-400 hover:text-gray-600 flex items-center justify-center"><X size={20} /></button>
              </div>
              <div className="p-6 text-center">
                <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2">
                  {Object.entries(draftWhMap).map(([code, config]) => (
                    <div key={code} className="flex items-center space-x-3 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                      <span className="font-mono text-sm font-bold text-gray-500 w-10 text-center">{code}</span>
                      <select className="border-gray-300 rounded text-sm p-1.5 focus:ring-blue-500 focus:border-blue-500 border bg-white cursor-pointer font-medium text-center" value={config.color} onChange={(e) => setDraftWhMap({...draftWhMap, [code]: { ...config, color: e.target.value }})}>
                        {['blue', 'green', 'red', 'orange', 'purple', 'gray'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                      <input type="text" className="flex-1 border-gray-300 rounded text-sm p-1.5 focus:ring-blue-500 focus:border-blue-500 border bg-white font-medium text-center" value={config.name} onChange={(e) => setDraftWhMap({...draftWhMap, [code]: { ...config, name: e.target.value }})} placeholder="請輸入倉別名稱" />
                      <button onClick={() => { const newMap = {...draftWhMap}; delete newMap[code]; setDraftWhMap(newMap); }} className="text-red-400 hover:text-red-600 p-1.5 bg-white rounded border border-transparent hover:border-red-100 shadow-sm flex items-center justify-center" title="刪除"><Trash2 size={16} /></button>
                    </div>
                  ))}
                  {Object.keys(draftWhMap).length === 0 && <p className="text-sm text-center text-gray-400 py-4">目前無任何自訂倉別</p>}
                </div>
                <div className="border-t border-gray-100 pt-5">
                  <p className="text-xs font-bold text-gray-500 mb-2 text-center">新增倉別對應</p>
                  <div className="flex space-x-2">
                    <input type="text" placeholder="代號 (如:03)" className="w-24 border-gray-300 rounded text-sm p-2 border focus:ring-blue-500 focus:border-blue-500 text-center" value={newWhCode} onChange={(e) => setNewWhCode(e.target.value)} />
                    <select className="border-gray-300 rounded text-sm p-2 focus:ring-blue-500 focus:border-blue-500 border bg-white cursor-pointer text-center" value={newWhColor} onChange={(e) => setNewWhColor(e.target.value)}>
                      {['blue', 'green', 'red', 'orange', 'purple', 'gray'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <input type="text" placeholder="名稱 (如:岡山倉)" className="flex-1 border-gray-300 rounded text-sm p-2 border focus:ring-blue-500 focus:border-blue-500 text-center" value={newWhName} onChange={(e) => setNewWhName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newWhCode && newWhName) { setDraftWhMap({...draftWhMap, [newWhCode]: { name: newWhName, color: newWhColor }}); setNewWhCode(''); setNewWhName(''); setNewWhColor('gray'); } }} />
                    <button onClick={() => { if(newWhCode && newWhName) { setDraftWhMap({...draftWhMap, [newWhCode]: { name: newWhName, color: newWhColor }}); setNewWhCode(''); setNewWhName(''); setNewWhColor('gray'); } }} disabled={!newWhCode || !newWhName} className="bg-blue-100 text-blue-700 p-2.5 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex justify-center items-center" title="新增"><Plus size={20} /></button>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-center">
                <button onClick={commitWhMap} className="bg-blue-600 text-white px-8 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition-shadow shadow-sm shadow-blue-500/20 w-full md:w-auto">完成編輯並同步</button>
              </div>
            </div>
          </div>
        )}
        
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes fade-in-down { 0% { opacity: 0; transform: translate(-50%, -20px); } 100% { opacity: 1; transform: translate(-50%, 0); } }
          .animate-fade-in-down { animation: fade-in-down 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
          @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
        `}} />
      </div>
    </AppContext.Provider>
  );
}