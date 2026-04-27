import { useState, useRef, ChangeEvent, useEffect } from 'react';
import * as htmlToImage from 'html-to-image';
import { FolderPlus, Download } from 'lucide-react';
import './App.css';

function App() {
  const [mainTitle, setMainTitle] = useState('진촌리 한국 기독교의 섬\n기념 공원 준공식');
  const [subDesc, setSubDesc] = useState('백령도에 피어난 역사와 신앙의 꽃');
  const [bgImage, setBgImage] = useState('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=1080&auto=format&fit=crop');
  
  interface TabData {
    name: string;
    fileCount: number;
    fileNames: string[];
    thumbnails: string[];
    imageUrl: string;
    hwpFile: File | null;
    mainTitle: string;
    subDesc: string;
    instagram: string;
    facebook: string;
    kakaostory: string;
    blog: string;
  }
  
  const [tabs, setTabs] = useState<TabData[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  
  // SNS Copy states
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [kakaostory, setKakaostory] = useState('');
  const [blog, setBlog] = useState('');
  
  // Track upload stats
  const [uploadStats, setUploadStats] = useState<{
    total: number;
    grouped: number;
    ignoredDetails: { name: string, reason: string }[];
  }>({ total: 0, grouped: 0, ignoredDetails: [] });

  const cardRef45 = useRef<HTMLDivElement>(null);
  const cardRef11 = useRef<HTMLDivElement>(null);
  const containerRef45 = useRef<HTMLDivElement>(null);
  const containerRef11 = useRef<HTMLDivElement>(null);
  
  const [scale45, setScale45] = useState(1);
  const [scale11, setScale11] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === containerRef45.current) {
          setScale45(entry.contentRect.width / 1080);
        } else if (entry.target === containerRef11.current) {
          setScale11(entry.contentRect.width / 1080);
        }
      }
    });

    if (containerRef45.current) observer.observe(containerRef45.current);
    if (containerRef11.current) observer.observe(containerRef11.current);

    return () => observer.disconnect();
  }, [tabs.length]);

  const processFiles = (files: File[]) => {
    if (!files || files.length === 0) return;
    
    // Use an object to store group info, indexing by a heavily normalized key
    const groups: Record<string, { displayName: string, fileList: File[] }> = {};
    
    files.forEach(file => {
      // 1. Remove extension
      let baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      // 2. Strip ending variations like -1, _1, (1), - 1, etc.
      baseName = baseName.replace(/[-\s_]+\d+$/, '').replace(/\(\d+\)$/, '').trim();

      // 3. Create a smart 'normalized key' to ignore punctuation & space differences
      // This solves the problem where "단어, 단어" and "단어 단어" are treated differently
      const normalizedKey = baseName.replace(/[\s,.'"`\-_()\[\]{}!?]+/g, '');

      if (!groups[normalizedKey]) {
        groups[normalizedKey] = { displayName: baseName, fileList: [] };
      } else {
        // If this file is an image, prioritize its name as the tab's display name
        const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
        if (isImage) {
          groups[normalizedKey].displayName = baseName;
        }
      }

      groups[normalizedKey].fileList.push(file);
    });

    let groupedFilesCount = 0;
    const ignored: { name: string, reason: string }[] = [];

    const newTabs = Object.values(groups).map((groupInfo) => {
      const name = groupInfo.displayName;
      const fileList = groupInfo.fileList;
      
      // Consider both OS standard image mimetypes and manual extensions for safety
      const imageFiles = fileList.filter(f => f.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name));
      const thumbnails = imageFiles.map(f => URL.createObjectURL(f));
      
      const hwpFile = fileList.find(f => f.name.toLowerCase().endsWith('.hwp')) || null;

      return {
        name,
        fileCount: fileList.length,
        fileNames: fileList.map(f => f.name),
        thumbnails,
        imageUrl: thumbnails.length > 0 ? thumbnails[0] : '',
        hwpFile,
        mainTitle: '진촌리 한국 기독교의 섬\n기념 공원 준공식',
        subDesc: '백령도에 피어난 역사와 신앙의 꽃',
        instagram: '',
        facebook: '',
        kakaostory: '',
        blog: ''
      };
    }).filter(tab => {
      // 1. 이미지만 있는 경우도 목록에 표시하기 위해 true 반환
      if (tab.thumbnails.length > 0) {
        groupedFilesCount += tab.fileCount;
        return true;
      } 
      
      // 2. 그 외 (이미지가 없는 경우 등)
      tab.fileNames.forEach(fname => {
        let reason = '연결될 배경 이미지가 없음';
        if (fname.startsWith('.') || fname.toLowerCase() === 'thumbs.db' || fname.toLowerCase() === 'desktop.ini') {
          reason = '시스템 숨김/설정 파일';
        } else if (/\.(txt|pdf|docx|xlsx)$/i.test(fname)) {
          reason = '지원하지 않는 단독 문서 파일';
        } else if (/\.(hwp|hwpx)$/i.test(fname) && tab.thumbnails.length === 0) {
          reason = '연결될 배경 이미지가 없는 단독 보도자료(HWP)';
        }
        ignored.push({ name: fname, reason });
      });
      return false;
    });

    newTabs.sort((a, b) => a.name.localeCompare(b.name));

    setTabs(newTabs);
    setUploadStats({ total: files.length, grouped: groupedFilesCount, ignoredDetails: ignored });
    
    if (newTabs.length > 0) {
      setActiveTab(newTabs[0].name);
      setBgImage(newTabs[0].imageUrl);
      setMainTitle(newTabs[0].mainTitle);
      setSubDesc(newTabs[0].subDesc);
      setInstagram(newTabs[0].instagram || '');
      setFacebook(newTabs[0].facebook || '');
      setKakaostory(newTabs[0].kakaostory || '');
      setBlog(newTabs[0].blog || '');
    }
  };

  const handleFolderUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    if (!items) return;

    const fileArray: File[] = [];

    const traverseFileTree = async (item: any, path: string = '') => {
      if (item.isFile) {
        const file = await new Promise<File>((resolve) => item.file(resolve));
        fileArray.push(file);
      } else if (item.isDirectory) {
        const dirReader = item.createReader();
        const readAllEntries = async (): Promise<any[]> => {
          let allEntries: any[] = [];
          const readEntries = async () => {
            const entries = await new Promise<any[]>((resolve) => dirReader.readEntries(resolve));
            if (entries.length > 0) {
              allEntries = allEntries.concat(entries);
              await readEntries();
            }
          };
          await readEntries();
          return allEntries;
        };
        const entries = await readAllEntries();
        for (const entry of entries) {
          await traverseFileTree(entry, path + item.name + '/');
        }
      }
    };

    for (let i = 0; i < items.length; i++) {
      const item = items[i].webkitGetAsEntry();
      if (item) {
        await traverseFileTree(item);
      }
    }

    processFiles(fileArray);
  };

  const handleAIGenerateSingle = async (tabName: string) => {
    const tabIndex = tabs.findIndex(t => t.name === tabName);
    if (tabIndex === -1) return;
    const tab = tabs[tabIndex];

    if (!tab.hwpFile) {
        alert("보도자료(HWP) 파일이 없어 AI 분석을 실행할 수 없습니다.");
        return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress(`AI 분석 중... - ${tab.name}`);

    const formData = new FormData();
    formData.append("file", tab.hwpFile);
    
    try {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
        const res = await fetch(`${apiUrl}/api/extract-news`, {
            method: "POST",
            body: formData,
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => null);
            const errMsg = errData?.detail || `서버 오류 (${res.status})`;
            throw new Error(errMsg);
        }
        const data = await res.json();
        const newMain = data.mainTitle || tab.mainTitle;
        const newSub = data.subTitle || tab.subDesc;
        const newInsta = data.instagram || tab.instagram;
        const newFb = data.facebook || tab.facebook;
        const newKakao = data.kakaostory || tab.kakaostory;
        const newBlog = data.blog || tab.blog;
        
        setTabs(prev => {
            const updated = [...prev];
            updated[tabIndex] = { 
                ...updated[tabIndex], 
                mainTitle: newMain, 
                subDesc: newSub,
                instagram: newInsta,
                facebook: newFb,
                kakaostory: newKakao,
                blog: newBlog
            };
            return updated;
        });
        
        // 현재 활성화된 탭이면 화면도 즉시 변경
        if (tab.name === activeTab) {
            setMainTitle(newMain);
            setSubDesc(newSub);
            setInstagram(newInsta);
            setFacebook(newFb);
            setKakaostory(newKakao);
            setBlog(newBlog);
        }
        alert(`[${tab.name}] AI 생성이 완료되었습니다.`);
    } catch (err: any) {
        console.error(`AI 분석 오류 (${tab.name}):`, err);
        alert(`[${tab.name}] 내용 갱신 실패: ${err.message}`);
    } finally {
        setIsAnalyzing(false);
        setAnalysisProgress('');
    }
  };

  const handleDownloadAllZip = async () => {
    if (tabs.length === 0) return;
    setIsGenerating(true);
    
    try {
      const JSZip = (await import('jszip')).default;
      const fileSaver = await import('file-saver');
      const saveAs = fileSaver.saveAs || fileSaver.default?.saveAs || (fileSaver.default as any);
      const zip = new JSZip();

      // 기존 선택 탭 저장
      const originalActiveTab = activeTab;

      for (let i = 0; i < tabs.length; i++) {
        const tab = tabs[i];
        
        // 보도자료 없이 이미지만 있는 폴더는 전체 다운로드에서 제외
        if (!tab.hwpFile) continue;
        
        // 1. 해당 탭으로 화면 강제 전환 (렌더링 갱신용)
        setActiveTab(tab.name);
        setBgImage(tab.imageUrl);
        setMainTitle(tab.mainTitle);
        setSubDesc(tab.subDesc);
        
        // 2. Canvas가 새로 그려질 짧은 대기 시간
        await new Promise(res => setTimeout(res, 500));
        
        if (!cardRef45.current || !cardRef11.current) continue;

        // 3. ZIP 내부에 해당 탭 이름으로 폴더 생성
        const folder = zip.folder(tab.name);
        if (!folder) continue;

        // 4. 세로형/정방형 이미지 데이터 캡처
        const dataUrl45 = await htmlToImage.toPng(cardRef45.current, {
          quality: 1, width: 1080, height: 1350, pixelRatio: 1,
          style: { transform: 'scale(1)', transformOrigin: 'top left' }
        });
        const dataUrl11 = await htmlToImage.toPng(cardRef11.current, {
          quality: 1, width: 1080, height: 1080, pixelRatio: 1,
          style: { transform: 'scale(1)', transformOrigin: 'top left' }
        });

        const base6445 = dataUrl45.split(',')[1];
        const base6411 = dataUrl11.split(',')[1];

        // 5. 생성된 폴더 안에 이미지 삽입
        folder.file(`${tab.name}_세로형.png`, base6445, { base64: true });
        folder.file(`${tab.name}_정방형.png`, base6411, { base64: true });

        // SNS 원고 내용 저장
        const snsText = `[${tab.name} SNS 원고]\n\n` +
          (tab.instagram ? `[인스타그램]\n${tab.instagram}\n\n` : '') +
          (tab.facebook ? `[페이스북]\n${tab.facebook}\n\n` : '') +
          (tab.kakaostory ? `[카카오스토리]\n${tab.kakaostory}\n\n` : '') +
          (tab.blog ? `[네이버 블로그]\n${tab.blog}\n\n` : '');

        if (snsText.trim() !== `[${tab.name} SNS 원고]`) {
          folder.file(`${tab.name}_SNS원고.txt`, snsText);
        }
      }

      // 6. 원래 탭으로 복구
      setActiveTab(originalActiveTab);
      const origTabInfo = tabs.find(t => t.name === originalActiveTab);
      if (origTabInfo) {
          setBgImage(origTabInfo.imageUrl);
          setMainTitle(origTabInfo.mainTitle);
          setSubDesc(origTabInfo.subDesc);
      }

      // 7. ZIP 파일 생성 및 다운로드 (file-saver 사용)
      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, `AutoCardStudio_전체결과.zip`);
      alert("모든 직업 공간의 이미지가 폴더별 ZIP 파일로 다운로드되었습니다!");

    } catch (err) {
      console.error('Failed to generate all images', err);
      alert("전체 다운로드 중 오류가 발생했습니다: " + String(err));
    } finally {
      setIsGenerating(false);
    }
  };

  const activeTabData = tabs.find(t => t.name === activeTab);

  return (
    <div className="layout">
      {/* Header */}
      <header className="header">
        <div className="logo-group">
          <h1>AutoCard Studio</h1>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={handleDownloadAllZip} disabled={isGenerating || tabs.length === 0} style={{ width: '44px', height: '44px', padding: 0, justifyContent: 'center' }} title="전체 탭 압축 저장">
            <Download size={20} />
          </button>
        </div>
      </header>

      {tabs.length === 0 ? (
        <main className="main-content" style={{ justifyContent: 'center', alignItems: 'center', background: '#f1f5f9' }}>
          <div className="upload-container" style={{
            display: 'flex',
            flexDirection: 'row',
            width: '800px',
            height: '420px',
            background: '#ffffff',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0'
          }}>
            {/* Left Color Pane */}
            <div style={{
              flex: '1',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color: '#ffffff',
              padding: '4rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1.5rem', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                START<br/>WORKSPACE
              </h2>
              <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.5)', marginBottom: '2.5rem' }}></div>
              <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.95rem', lineHeight: 1.6, wordBreak: 'keep-all' }}>
                폴더를 업로드하여 AI 카드뉴스와 SNS 자동 원고 생성을 시작하세요.
              </p>
            </div>
            
            {/* Right Upload Action Pane */}
            <div style={{
              flex: '1',
              position: 'relative',
              display: 'flex',
              background: '#ffffff'
            }}>
              <input 
                type="file" 
                id="folder-upload-main" 
                style={{ display: 'none' }}
                // @ts-expect-error webkitdirectory is standard for folder picking
                webkitdirectory=""
                directory=""
                multiple
                onChange={handleFolderUpload}
              />
              <label 
                htmlFor="folder-upload-main" 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: '100%',
                  height: '100%',
                  background: isDragging ? '#eff6ff' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  if (isDragging) return;
                  e.currentTarget.style.background = '#f8fafc';
                  const icon = e.currentTarget.querySelector('.upload-icon') as HTMLElement;
                  if(icon) {
                    icon.style.color = '#7c3aed';
                    icon.style.transform = 'translateY(-5px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (isDragging) return;
                  e.currentTarget.style.background = '#ffffff';
                  const icon = e.currentTarget.querySelector('.upload-icon') as HTMLElement;
                  if(icon) {
                    icon.style.color = '#64748b';
                    icon.style.transform = 'translateY(0)';
                  }
                }}
              >
                <div className="upload-icon" style={{ color: isDragging ? '#7c3aed' : '#64748b', transition: 'all 0.3s ease', marginBottom: '1.2rem', transform: isDragging ? 'translateY(-5px)' : 'none' }}>
                  <FolderPlus size={56} strokeWidth={1.5} />
                </div>
                <span style={{ fontSize: '1.15rem', fontWeight: 600, color: isDragging ? '#7c3aed' : '#1e293b', letterSpacing: '0.05em' }}>
                  {isDragging ? '여기에 폴더를 놓으세요' : '폴더 선택하기'}
                </span>
                <span style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                  {isDragging ? '파일이 자동으로 분류됩니다' : '클릭 또는 폴더를 드래그 앤 드롭'}
                </span>
              </label>
            </div>
          </div>
        </main>
      ) : (
        <main className="main-content" style={{ flexDirection: 'row' }}>
          
          {/* Left Panel - Preview */}
          <div className="preview-panel" style={{ flex: 4, padding: '1.5rem', overflowY: 'auto' }}>
            <div className="preview-cards-grid">
              
              {/* Card 1: 4:5 */}
              <div className="preview-wrapper">
                <div className="preview-label">세로형 (4:5)</div>
                <div className="card-canvas-container aspect-4-5" ref={containerRef45}>
                  <div 
                    ref={cardRef45} 
                    className="card-canvas ratio-4-5"
                    style={{ 
                      backgroundImage: `url("${bgImage}")`,
                      transform: `scale(${scale45})` 
                    }}
                  >
                    <div className="card-overlay"></div>
                    {isAnalyzing ? (
                      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                        <span className="text-white text-2xl font-bold font-['Pretendard'] text-center px-8">
                          {analysisProgress ? analysisProgress : "AI가 응답을 기다리는 중..."}
                        </span>
                      </div>
                    ) : (
                      <div className="card-content-area">
                      <div className="card-desc">
                        {subDesc.split('\n').map((line, i) => (
                          <div key={i} style={{ width: '100%' }}>{line}</div>
                        ))}
                      </div>
                      <div className="card-title">
                        {mainTitle.split('\n').map((line, i) => (
                          <div key={i} style={{ width: '100%' }}>{line}</div>
                        ))}
                      </div>
                    </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 2: 1:1 */}
              <div className="preview-wrapper">
                <div className="preview-label">정방형 (1:1)</div>
                <div className="card-canvas-container aspect-1-1" ref={containerRef11}>
                  <div 
                    ref={cardRef11} 
                    className="card-canvas ratio-1-1"
                    style={{ 
                      backgroundImage: `url("${bgImage}")`,
                      transform: `scale(${scale11})`
                    }}
                  >
                    <div className="card-overlay"></div>
                    <div className="card-content-area">
                      <div className="card-desc">
                        {subDesc.split('\n').map((line, i) => (
                          <div key={i} style={{ width: '100%' }}>{line}</div>
                        ))}
                      </div>
                      <div className="card-title">
                        {mainTitle.split('\n').map((line, i) => (
                          <div key={i} style={{ width: '100%' }}>{line}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Right Panel - Editor & List */}
          <div className="editor-panel" style={{ flex: 6, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Top Section: Group List */}
            <div className="group-list-container" style={{ padding: '0.5rem', maxHeight: '40vh', overflowY: 'auto', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>작업 그룹 리스트 (총 {tabs.length}개)</h2>
              </div>
              
              {uploadStats.ignoredDetails.length > 0 && (
                <div className="ignored-files-box" style={{ marginBottom: '1rem' }}>
                  <span className="ignored-header">⚠️ 제외된 파일 내역 및 사유 ({uploadStats.ignoredDetails.length}개)</span>
                  <ul className="ignored-list">
                    {uploadStats.ignoredDetails.map((f, i) => (
                      <li key={i}>
                        <span className="ignored-name">{f.name}</span>
                        <span className="ignored-reason">({f.reason})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingLeft: '1rem', marginTop: '0.5rem' }}>
                {tabs.map((tab, idx) => {
                  const imgCount = tab.thumbnails.length;
                  const hwpCount = tab.hwpFile ? 1 : 0;
                  const compositionStr = `이미지 ${imgCount}장${hwpCount > 0 ? `, 보도자료 ${hwpCount}개` : ''}`;

                  return (
                    <div 
                      key={tab.name}
                      onClick={() => {
                        setActiveTab(tab.name);
                        setBgImage(tab.imageUrl);
                        setMainTitle(tab.mainTitle);
                        setSubDesc(tab.subDesc);
                        setInstagram(tab.instagram || '');
                        setFacebook(tab.facebook || '');
                        setKakaostory(tab.kakaostory || '');
                        setBlog(tab.blog || '');
                      }}
                      style={{ 
                        width: '100%',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                        padding: '0.6rem 1.2rem 0.6rem 0.6rem', background: activeTab === tab.name ? '#eff6ff' : '#ffffff', 
                        border: `1px solid ${activeTab === tab.name ? '#4f46e5' : '#e2e8f0'}`, 
                        borderRadius: '50px 12px 12px 50px',
                        cursor: 'pointer', transition: 'all 0.2s ease', 
                        boxShadow: activeTab === tab.name ? '0 4px 15px rgba(99, 102, 241, 0.1)' : '0 2px 5px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                        {/* Big Circle Number wrapped inside */}
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: activeTab === tab.name ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : '#f1f5f9',
                          color: activeTab === tab.name ? '#ffffff' : '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 500,
                          fontSize: '1.1rem',
                          boxShadow: activeTab === tab.name ? '0 4px 10px rgba(99, 102, 241, 0.3)' : 'inset 0 2px 4px rgba(0,0,0,0.05)',
                          flexShrink: 0
                        }}>
                          {idx + 1}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          <span style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e293b', letterSpacing: '-0.02em' }}>
                            {tab.name}
                          </span>
                          <span style={{ fontSize: '0.85rem', color: !tab.hwpFile ? '#ef4444' : '#64748b' }}>
                            {compositionStr}
                          </span>
                        </div>
                      </div>
                      <button 
                        className="btn-primary"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', backgroundColor: '#10b981', borderColor: '#10b981', opacity: !tab.hwpFile ? 0.3 : 1 }}
                        onClick={(e) => { e.stopPropagation(); handleAIGenerateSingle(tab.name); }}
                        disabled={isAnalyzing || !tab.hwpFile}
                      >
                        AI 생성하기
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Detail Editor Section */}
            <div className="panel-section">
              <div className="section-header">
                상세 내용 편집
              </div>
              
              {/* Image Thumbnails for Active Tab */}
              {activeTabData && activeTabData.thumbnails.length > 0 && (
                <div className="thumbnails-row" style={{ marginBottom: '1.2rem', gap: '0.8rem' }}>
                  <span className="info-label" style={{ marginBottom: '0.4rem', fontWeight: 600 }}>배경 이미지</span>
                  <div className="thumbnails-list">
                    {activeTabData.thumbnails.map((thumbUrl, idx) => (
                      <img 
                        key={idx} 
                        src={thumbUrl} 
                        className={`thumb-img ${bgImage === thumbUrl ? 'active' : ''}`}
                        onClick={() => setBgImage(thumbUrl)}
                        alt={`${activeTab} thumb ${idx}`} 
                      />
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="input-group">
                  <label style={{ fontWeight: 600 }}>메인 타이틀 (제목)</label>
                  <textarea 
                    value={mainTitle} 
                    onChange={(e) => {
                      setMainTitle(e.target.value);
                      setTabs(prev => prev.map(t => t.name === activeTab ? { ...t, mainTitle: e.target.value } : t));
                    }}
                    placeholder="예: 진촌리 한국 기독교의 섬 기념 공원 준공식"
                    style={{ minHeight: '60px' }}
                  />
                </div>

                <div className="input-group">
                  <label style={{ fontWeight: 600 }}>서브 텍스트 (내용)</label>
                  <input 
                    type="text" 
                    value={subDesc} 
                    onChange={(e) => {
                      setSubDesc(e.target.value);
                      setTabs(prev => prev.map(t => t.name === activeTab ? { ...t, subDesc: e.target.value } : t));
                    }}
                    placeholder="예: 백령도에 피어난 역사와 신앙의 꽃"
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1rem' }}>
                  <div style={{ background: '#E1306C', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                    </svg>
                  </div>
                  <textarea 
                    value={instagram} 
                    onChange={e => {
                      setInstagram(e.target.value);
                      setTabs(prev => prev.map(t => t.name === activeTab ? { ...t, instagram: e.target.value } : t));
                    }} 
                    placeholder="AI가 생성한 인스타그램 원고가 표시됩니다."
                    style={{ flex: 1, minHeight: '100px', resize: 'vertical', padding: '1rem' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ background: '#1877F2', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                    </svg>
                  </div>
                  <textarea 
                    value={facebook} 
                    onChange={e => {
                      setFacebook(e.target.value);
                      setTabs(prev => prev.map(t => t.name === activeTab ? { ...t, facebook: e.target.value } : t));
                    }} 
                    placeholder="AI가 생성한 페이스북 원고가 표시됩니다."
                    style={{ flex: 1, minHeight: '100px', resize: 'vertical', padding: '1rem' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ background: '#FEE500', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#3A1D1D">
                      <path d="M12 3c-5.523 0-10 3.582-10 8 0 2.864 1.838 5.373 4.582 6.812-.224.84-1.154 4.31-.137 4.148 1.018-.162 5.048-3.349 5.048-3.349.167.014.336.023.507.023 5.523 0 10-3.582 10-8s-4.477-8-10-8z"/>
                    </svg>
                  </div>
                  <textarea 
                    value={kakaostory} 
                    onChange={e => {
                      setKakaostory(e.target.value);
                      setTabs(prev => prev.map(t => t.name === activeTab ? { ...t, kakaostory: e.target.value } : t));
                    }} 
                    placeholder="AI가 생성한 카카오스토리 원고가 표시됩니다."
                    style={{ flex: 1, minHeight: '100px', resize: 'vertical', padding: '1rem' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ background: '#03C75A', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                      <path d="M16.273 17.571h-3.333v-6.071L8.727 17.571H5V5.5h3.333v6.071L13.273 5.5h3.727v12.071z"/>
                    </svg>
                  </div>
                  <textarea 
                    value={blog} 
                    onChange={e => {
                      setBlog(e.target.value);
                      setTabs(prev => prev.map(t => t.name === activeTab ? { ...t, blog: e.target.value } : t));
                    }} 
                    placeholder="AI가 생성한 블로그 원고가 표시됩니다."
                    style={{ flex: 1, minHeight: '150px', resize: 'vertical', padding: '1rem' }}
                  />
                </div>
              </div>
            </div>

          </div>
        </main>
      )}
    </div>
  );
}

export default App;
