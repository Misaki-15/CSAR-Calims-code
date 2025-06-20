import React, { useState, useEffect } from 'react';
import { Download, RotateCcw, Sparkles, TrendingUp, BarChart3, Eye, Brain, BookOpen, Target, AlertCircle, CheckCircle, XCircle, Shield, Save, Upload } from 'lucide-react';

const SmartClaimsAnalyzer = () => {
  const exportToExcel = () => {
    const rows = claims.map((claim, index) => ({
      序号: index + 1,
      原始功效宣称: claim,
      识别维度: analysisResults[claim]?.dimension || "",
      关键词: analysisResults[claim]?.keywords?.join("、") || "",
      推荐表述: analysisResults[claim]?.recommended || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "宣称分析");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const file = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(file, "claims-analysis.xlsx");
  };

  // 从 localStorage 加载初始数据
  const loadInitialData = () => {
    try {
      const savedData = localStorage.getItem('claimsAnalyzerLearningData');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        console.log('Loaded learning data from localStorage:', parsed);
        return parsed;
      }
    } catch (error) {
      console.error('Error loading data from localStorage:', error);
    }
    
    // 默认初始数据
    return {
      corrections: [],
      newKeywords: {
        功效: {},
        类型: {},
        持续性: {}
      },
      confidence: {},
      userFeedback: {},
      keywordScores: {},
      conflictLog: [],
      removedKeywords: {},
      lastUpdated: null,
      version: '1.0'
    };
  };

  const [inputText, setInputText] = useState('');
  const [analysisResults, setAnalysisResults] = useState([]);
  const [learningData, setLearningData] = useState(loadInitialData());
  const [showLearningPanel, setShowLearningPanel] = useState(false);
  const [editingResult, setEditingResult] = useState(null);
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedEfficacy, setSelectedEfficacy] = useState('');
  const [validationMessage, setValidationMessage] = useState({ type: '', message: '' });
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaveTime, setLastSaveTime] = useState(null);

  // 自动保存到 localStorage
  useEffect(() => {
    if (autoSaveEnabled) {
      const saveTimer = setTimeout(() => {
        saveLearningData();
      }, 1000); // 1秒后保存，避免频繁写入

      return () => clearTimeout(saveTimer);
    }
  }, [learningData, autoSaveEnabled]);

  // 保存学习数据
  const saveLearningData = () => {
    try {
      const dataToSave = {
        ...learningData,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('claimsAnalyzerLearningData', JSON.stringify(dataToSave));
      setLastSaveTime(new Date());
      console.log('Learning data saved to localStorage');
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      setValidationMessage({
        type: 'error',
        message: '保存失败：存储空间可能已满'
      });
    }
  };

  // 导出学习数据
  const exportLearningData = () => {
    const dataToExport = {
      ...learningData,
      exportDate: new Date().toISOString(),
      baseKeywordMapping: baseKeywordMapping
    };
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json'
    });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `化妆品宣称分析器学习数据_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    
    setValidationMessage({
      type: 'success',
      message: '学习数据已导出'
    });
  };

  // 导入学习数据
  const importLearningData = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        
        // 验证导入的数据结构
        if (imported.newKeywords && imported.keywordScores) {
          // 合并导入的数据与现有数据
          const mergedData = {
            corrections: [...learningData.corrections, ...(imported.corrections || [])],
            newKeywords: mergeKeywords(learningData.newKeywords, imported.newKeywords),
            confidence: { ...learningData.confidence, ...imported.confidence },
            userFeedback: { ...learningData.userFeedback, ...imported.userFeedback },
            keywordScores: { ...learningData.keywordScores, ...imported.keywordScores },
            conflictLog: [...learningData.conflictLog, ...(imported.conflictLog || [])],
            removedKeywords: { ...learningData.removedKeywords, ...imported.removedKeywords },
            lastUpdated: new Date().toISOString(),
            version: imported.version || '1.0'
          };
          
          setLearningData(mergedData);
          setValidationMessage({
            type: 'success',
            message: '学习数据导入成功'
          });
        } else {
          throw new Error('Invalid data format');
        }
      } catch (error) {
        console.error('Import error:', error);
        setValidationMessage({
          type: 'error',
          message: '导入失败：文件格式不正确'
        });
      }
    };
    
    reader.readAsText(file);
    event.target.value = ''; // 清空input以允许重复导入同一文件
  };

  // 合并关键词数据
  const mergeKeywords = (existing, imported) => {
    const merged = JSON.parse(JSON.stringify(existing));
    
    Object.entries(imported).forEach(([category, efficacies]) => {
      if (!merged[category]) merged[category] = {};
      
      Object.entries(efficacies).forEach(([efficacy, keywords]) => {
        if (!merged[category][efficacy]) {
          merged[category][efficacy] = keywords;
        } else {
          // 合并关键词，去重
          const combinedKeywords = [...merged[category][efficacy], ...keywords];
          merged[category][efficacy] = [...new Set(combinedKeywords)];
        }
      });
    });
    
    return merged;
  };

  // 清空学习数据
  const clearLearningData = () => {
    if (confirm('确定要清空所有学习数据吗？此操作不可恢复！')) {
      const emptyData = {
        corrections: [],
        newKeywords: {
          功效: {},
          类型: {},
          持续性: {}
        },
        confidence: {},
        userFeedback: {},
        keywordScores: {},
        conflictLog: [],
        removedKeywords: {},
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      };
      
      setLearningData(emptyData);
      localStorage.removeItem('claimsAnalyzerLearningData');
      setValidationMessage({
        type: 'success',
        message: '学习数据已清空'
      });
    }
  };

  const dimension1Options = [
    { value: '染发', code: '01', desc: '以改变头发颜色为目的，使用后即时清洗不能恢复头发原有颜色', color: 'bg-red-100 text-red-800' },
    { value: '烫发', code: '02', desc: '用于改变头发弯曲度（弯曲或拉直），并维持相对稳定', color: 'bg-pink-100 text-pink-800' },
    { value: '祛斑美白', code: '03', desc: '有助于减轻或减缓皮肤色素沉着，达到皮肤美白增白效果', color: 'bg-purple-100 text-purple-800' },
    { value: '防晒', code: '04', desc: '用于保护皮肤、口唇免受特定紫外线所带来的损伤', color: 'bg-orange-100 text-orange-800' },
    { value: '防脱发', code: '05', desc: '有助于改善或减少头发脱落', color: 'bg-yellow-100 text-yellow-800' },
    { value: '祛痘', code: '06', desc: '有助于减少或减缓粉刺的发生；有助于粉刺发生后皮肤的恢复', color: 'bg-green-100 text-green-800' },
    { value: '滋养', code: '07', desc: '有助于为施用部位提供滋养作用', color: 'bg-teal-100 text-teal-800' },
    { value: '修护', code: '08', desc: '有助于维护施用部位保持正常状态', color: 'bg-cyan-100 text-cyan-800' },
    { value: '清洁', code: '09', desc: '用于除去施用部位表面的污垢及附着物', color: 'bg-blue-100 text-blue-800' },
    { value: '卸妆', code: '10', desc: '用于除去施用部位的彩妆等其他化妆品', color: 'bg-indigo-100 text-indigo-800' },
    { value: '保湿', code: '11', desc: '用于补充或增强施用部位水分、油脂等成分含量', color: 'bg-sky-100 text-sky-800' },
    { value: '美容修饰', code: '12', desc: '用于暂时改变施用部位外观状态，达到美化、修饰等作用', color: 'bg-rose-100 text-rose-800' },
    { value: '芳香', code: '13', desc: '具有芳香成分，有助于修饰体味，可增加香味', color: 'bg-violet-100 text-violet-800' },
    { value: '除臭', code: '14', desc: '有助于减轻或遮盖体臭', color: 'bg-fuchsia-100 text-fuchsia-800' },
    { value: '抗皱', code: '15', desc: '有助于减缓皮肤皱纹产生或使皱纹变得不明显', color: 'bg-emerald-100 text-emerald-800' },
    { value: '紧致', code: '16', desc: '有助于保持皮肤的紧实度、弹性', color: 'bg-lime-100 text-lime-800' },
    { value: '舒缓', code: '17', desc: '有助于改善皮肤刺激等状态', color: 'bg-amber-100 text-amber-800' },
    { value: '控油', code: '18', desc: '有助于减缓施用部位皮脂分泌和沉积', color: 'bg-stone-100 text-stone-800' },
    { value: '去角质', code: '19', desc: '有助于促进皮肤角质的脱落或促进角质更新', color: 'bg-zinc-100 text-zinc-800' },
    { value: '爽身', code: '20', desc: '有助于保持皮肤干爽或增强皮肤清凉感', color: 'bg-slate-100 text-slate-800' },
    { value: '护发', code: '21', desc: '有助于改善头发、胡须的梳理性，防止静电，保持或增强毛发的光泽', color: 'bg-gray-100 text-gray-800' },
    { value: '防断发', code: '22', desc: '有助于改善或减少头发断裂、分叉；有助于保持或增强头发韧性', color: 'bg-red-100 text-red-800' },
    { value: '去屑', code: '23', desc: '有助于减缓头屑的产生；有助于减少附着于头皮、头发的头屑', color: 'bg-pink-100 text-pink-800' },
    { value: '发色护理', code: '24', desc: '有助于在染发前后保持头发颜色的稳定', color: 'bg-purple-100 text-purple-800' },
    { value: '脱毛', code: '25', desc: '用于减少或除去体毛', color: 'bg-orange-100 text-orange-800' },
    { value: '辅助剃须剃毛', code: '26', desc: '用于软化、膨胀须发，有助于剃须剃毛时皮肤润滑', color: 'bg-yellow-100 text-yellow-800' },
    { value: '新功效', code: 'A', desc: '不符合以上规则的其他功效', color: 'bg-neutral-100 text-neutral-800' }
  ];

  const dimension2Options = [
    { value: '温和宣称', color: 'bg-green-100 text-green-800' },
    { value: '原料功效', color: 'bg-blue-100 text-blue-800' },
    { value: '量化指标', color: 'bg-purple-100 text-purple-800' },
    { value: '喜好度', color: 'bg-pink-100 text-pink-800' },
    { value: '质地', color: 'bg-orange-100 text-orange-800' },
    { value: '使用感受', color: 'bg-cyan-100 text-cyan-800' },
    { value: '使用后体验', color: 'bg-yellow-100 text-yellow-800' }
  ];

  const dimension3Options = [
    { value: '即时', color: 'bg-red-100 text-red-800' },
    { value: '持久', color: 'bg-blue-100 text-blue-800' }
  ];

  // 基础关键词映射（增加了语义相关性）
  const baseKeywordMapping = {
    功效: {
      '保湿|滋润|水润|锁水|补水|保水|润泽|湿润|水分|水嫩|玻尿酸|透明质酸|甘油|角鲨烷': '保湿',
      '美白|祛斑|亮白|透亮|去斑|淡斑|提亮|均匀肤色|白皙|净白|烟酰胺|熊果苷|VC': '祛斑美白',
      '抗皱|去皱|除皱|皱纹|纹路|细纹|表情纹|法令纹|鱼尾纹|抬头纹|视黄醇|肽': '抗皱',
      '紧致|紧实|弹性|胶原|胶原蛋白|提拉|lifting|firmness|弹力|塑形': '紧致',
      '滋养|润养|养护|深层滋养|营养|补养|润泽|浸润|渗透|精华': '滋养',
      '修护|修复|屏障|强韧|修复力|愈合|重建|再生|修复因子|神经酰胺': '修护',
      '清洁|洗净|去污|清洗|冲洗|洁净|深层清洁|彻底清洁|温和清洁|泡沫': '清洁',
      '控油|吸油|去油|油腻|油光|T区|出油|皮脂|哑光|清爽|水杨酸': '控油',
      '舒缓|缓解|减轻|改善刺激|温和|安抚|镇静|敏感|刺激|积雪草|洋甘菊': '舒缓',
      '防晒|隔离|防护|阻挡|紫外线|UV|SPF|PA|日晒|阳光|氧化锌|二氧化钛': '防晒',
      '护发|柔顺|丝滑|光泽|shine|顺滑|柔软|梳理|防静电|发膜|护发素': '护发',
      '祛痘|痘痘|粉刺|青春痘|暗疮|痤疮|黑头|白头|闭口|茶树|水杨酸': '祛痘',
      '染发|着色|上色|显色|彩色|颜色|发色|调色|漂色|染膏': '染发',
      '烫发|卷发|直发|弯曲|拉直|造型|定型|塑型|波浪|烫发水': '烫发',
      '卸妆|卸除|卸掉|去妆|卸妆水|卸妆油|卸妆乳|卸妆膏|清除彩妆': '卸妆',
      '美容|修饰|妆容|彩妆|化妆|遮瑕|遮盖|掩盖|美化|底妆': '美容修饰',
      '香|香味|香气|留香|体香|香调|香水|芳香|香氛|香精': '芳香',
      '除臭|去味|去异味|抑制异味|防臭|消臭|止汗|腋下|体味': '除臭',
      '去角质|角质|exfoliate|磨砂|剥脱|脱皮|死皮|果酸|酵素': '去角质',
      '爽身|干爽|清凉|凉爽|清爽|舒适|透气|凉感|薄荷': '爽身',
      '防脱|脱发|掉发|固发|育发|生发|发根|发量|浓密|生姜': '防脱发',
      '防断发|断发|分叉|韧性|强韧|坚韧|发丝强度|蛋白质': '防断发',
      '去屑|头屑|dandruff|头皮屑|鳞屑|片状|白屑|吡啶硫酮锌': '去屑',
      '发色护理|护色|锁色|保色|发色|色彩|颜色保持|护色素': '发色护理',
      '脱毛|除毛|去毛|hair removal|腿毛|腋毛|体毛|脱毛膏': '脱毛',
      '剃须|剃毛|shaving|胡须|胡子|刮胡|剃刀|剃须膏': '辅助剃须剃毛'
    },
    
    类型: {
      '温和|无刺激|不刺激|亲肤|gentle|mild|温柔|柔和|低刺激|敏感肌|0刺激': '温和宣称',
      '成分|原料|ingredient|含有|添加|富含|萃取|extract|精华|配方|活性物': '原料功效',
      '24小时|12小时|8小时|持续|%|倍|次|程度|测试|临床|数据|调查|数字': '量化指标',
      '喜欢|喜好|满意|推荐|好评|评价|好用|实用|有效|回购|点赞': '喜好度',
      '质地|texture|丝滑|绵密|轻盈|粘腻|厚重|轻薄|浓稠|延展性|触感': '质地',
      '感觉|感受到|体验|使用时|抹开|涂抹|上脸|第一感觉|瞬间|触碰': '使用感受',
      '使用后|用完|涂完|肌肤.*了|让.*肌|皮肤变得|坚持使用|长期使用|效果': '使用后体验'
    },
    
    持续性: {
      '即刻|立即|瞬间|马上|快速|即时|当下|现在|立竿见影|秒': '即时',
      '持久|长效|持续|24小时|12小时|8小时|长时间|长期|逐渐|慢慢': '持久'
    }
  };

  // 定义语义冲突组（不应该同时出现的功效）
  const semanticConflicts = {
    '保湿': ['控油', '去油'],
    '控油': ['保湿', '滋润', '滋养'],
    '美白': ['染发'],
    '清洁': ['滋养', '滋润'],
    '舒缓': ['去角质'],
    '防脱发': ['脱毛'],
  };

  // 计算关键词相似度
  const calculateSimilarity = (keyword1, keyword2) => {
    const len1 = keyword1.length;
    const len2 = keyword2.length;
    const maxLen = Math.max(len1, len2);
    
    // 简单的相似度计算
    let matches = 0;
    for (let i = 0; i < Math.min(len1, len2); i++) {
      if (keyword1[i] === keyword2[i]) matches++;
    }
    
    return matches / maxLen;
  };

  // 转义正则表达式特殊字符
  const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // 验证关键词是否适合某个功效类别
  const validateKeywordForEfficacy = (keyword, efficacy, category) => {
    const validation = {
      isValid: true,
      warnings: [],
      conflicts: []
    };

    // 检查是否与现有关键词冲突
    const dynamicMapping = getDynamicKeywordMapping();
    
    for (const [cat, mappings] of Object.entries(dynamicMapping)) {
      for (const [pattern, eff] of Object.entries(mappings)) {
        const keywords = pattern.split('|');
        for (const kw of keywords) {
          if (kw.toLowerCase() === keyword.toLowerCase() && eff !== efficacy) {
            validation.conflicts.push({
              category: cat,
              efficacy: eff,
              severity: 'high',
              existingKeyword: kw
            });
            validation.isValid = false;
          }
        }
      }
    }

    // 检查语义冲突
    if (semanticConflicts[efficacy]) {
      for (const conflictEfficacy of semanticConflicts[efficacy]) {
        const conflictPattern = Object.entries(dynamicMapping[category] || {})
          .find(([pattern, eff]) => eff === conflictEfficacy)?.[0];
        
        if (conflictPattern) {
          const conflictKeywords = conflictPattern.split('|');
          for (const ckw of conflictKeywords) {
            if (calculateSimilarity(keyword.toLowerCase(), ckw.toLowerCase()) > 0.7) {
              validation.warnings.push({
                type: 'semantic',
                message: `"${keyword}" 可能与 "${conflictEfficacy}" 功效的关键词 "${ckw}" 存在语义冲突`
              });
            }
          }
        }
      }
    }

    // 检查相似度
    const allKeywords = [];
    Object.values(dynamicMapping).forEach(categoryMap => {
      Object.keys(categoryMap).forEach(pattern => {
        pattern.split('|').forEach(kw => allKeywords.push(kw));
      });
    });

    for (const existingKeyword of allKeywords) {
      const similarity = calculateSimilarity(keyword.toLowerCase(), existingKeyword.toLowerCase());
      if (similarity > 0.8 && existingKeyword.toLowerCase() !== keyword.toLowerCase()) {
        validation.warnings.push({
          type: 'similarity',
          message: `"${keyword}" 与现有关键词 "${existingKeyword}" 相似度较高`
        });
      }
    }

    return validation;
  };

  // 动态关键词映射（从学习数据生成）
  const getDynamicKeywordMapping = () => {
    const dynamic = {
      功效: {},
      类型: {},
      持续性: {}
    };
    
    // 首先复制基础映射
    Object.entries(baseKeywordMapping).forEach(([category, mappings]) => {
      dynamic[category] = { ...mappings };
    });
    
    // 处理学习的新关键词
    if (learningData.newKeywords) {
      Object.entries(learningData.newKeywords).forEach(([category, keywords]) => {
        if (!keywords || !dynamic[category]) return;
        
        Object.entries(keywords).forEach(([efficacy, keywordList]) => {
          if (!keywordList || keywordList.length === 0) return;
          
          const removedKey = `${category}-${efficacy}`;
          const removedForEfficacy = (learningData.removedKeywords && learningData.removedKeywords[removedKey]) || [];
          const activeKeywords = keywordList.filter(kw => !removedForEfficacy.includes(kw));
          
          if (activeKeywords.length > 0) {
            // 查找该功效是否已有模式
            let existingPattern = null;
            for (const [pattern, eff] of Object.entries(dynamic[category])) {
              if (eff === efficacy) {
                existingPattern = pattern;
                break;
              }
            }
            
            if (existingPattern) {
              // 删除旧模式
              delete dynamic[category][existingPattern];
              // 创建新模式，包含原有和新学习的关键词
              const newPattern = existingPattern + '|' + activeKeywords.join('|');
              dynamic[category][newPattern] = efficacy;
            } else {
              // 创建全新的模式
              dynamic[category][activeKeywords.join('|')] = efficacy;
            }
          }
        });
      });
    }
    
    return dynamic;
  };

  const getEfficacyColor = (efficacy) => {
    const option = dimension1Options.find(opt => opt.value === efficacy);
    return option ? option.color : 'bg-gray-100 text-gray-800';
  };

  const getDimension2Color = (type) => {
    const option = dimension2Options.find(opt => opt.value === type);
    return option ? option.color : 'bg-gray-100 text-gray-800';
  };

  const getDimension3Color = (duration) => {
    const option = dimension3Options.find(opt => opt.value === duration);
    return option ? option.color : 'bg-gray-100 text-gray-800';
  };

  // 智能分析函数 - 支持多功效和学习能力
  const analyzeText = (text) => {
    const result = {
      dimension1: [],
      dimension2: '使用感受',
      dimension3: '即时',
      confidence: {
        dimension1: 0,
        dimension2: 0,
        dimension3: 0
      },
      matchedKeywords: []
    };

    // 获取最新的动态映射
    const currentMapping = getDynamicKeywordMapping();

    // 分析维度一（功效）
    const efficacyEntries = Object.entries(currentMapping.功效);
    // 按模式长度排序，优先匹配更具体的模式
    efficacyEntries.sort((a, b) => b[0].split('|').length - a[0].split('|').length);
    
    const matchedEfficacies = new Map(); // 使用Map来存储功效和匹配的关键词
    const matchedKeywordsList = [];
    
    for (const [keywords, category] of efficacyEntries) {
      // 将模式分解为单个关键词进行精确匹配
      const keywordArray = keywords.split('|');
      for (const keyword of keywordArray) {
        // 使用词边界进行更精确的匹配
        const escapedKeyword = escapeRegExp(keyword);
        const regex = new RegExp(`(^|[^\\u4e00-\\u9fa5a-zA-Z])${escapedKeyword}([^\\u4e00-\\u9fa5a-zA-Z]|$)`, 'i');
        const match = text.match(regex);
        if (match) {
          // 检查关键词得分
          const keywordScore = learningData.keywordScores[keyword] || 1;
          if (keywordScore > 0.3) { // 只使用得分高于阈值的关键词
            if (!matchedEfficacies.has(category)) {
              matchedEfficacies.set(category, []);
            }
            matchedEfficacies.get(category).push(keyword);
            matchedKeywordsList.push({
              category: 'dimension1',
              keyword: keyword,
              result: category,
              score: keywordScore
            });
          }
        }
      }
    }
    
    result.dimension1 = matchedEfficacies.size > 0 ? Array.from(matchedEfficacies.keys()) : ['新功效'];
    result.confidence.dimension1 = matchedEfficacies.size > 0 ? 
      Math.min(0.9, 0.5 + (matchedEfficacies.size * 0.2)) : 0.1;

    // 分析维度二（类型）
    const typeEntries = Object.entries(currentMapping.类型);
    typeEntries.sort((a, b) => b[0].split('|').length - a[0].split('|').length);
    
    for (const [keywords, category] of typeEntries) {
      const keywordArray = keywords.split('|');
      let matched = false;
      for (const keyword of keywordArray) {
        const escapedKeyword = escapeRegExp(keyword);
        const regex = new RegExp(`(^|[^\\u4e00-\\u9fa5a-zA-Z])${escapedKeyword}([^\\u4e00-\\u9fa5a-zA-Z]|$)`, 'i');
        const match = text.match(regex);
        if (match) {
          result.dimension2 = category;
          result.confidence.dimension2 = 0.8;
          matchedKeywordsList.push({
            category: 'dimension2',
            keyword: keyword,
            result: category
          });
          matched = true;
          break;
        }
      }
      if (matched) break;
    }

    // 分析维度三（持续性）
    for (const [keywords, category] of Object.entries(currentMapping.持续性)) {
      const keywordArray = keywords.split('|');
      let matched = false;
      for (const keyword of keywordArray) {
        const escapedKeyword = escapeRegExp(keyword);
        const regex = new RegExp(`(^|[^\\u4e00-\\u9fa5a-zA-Z])${escapedKeyword}([^\\u4e00-\\u9fa5a-zA-Z]|$)`, 'i');
        const match = text.match(regex);
        if (match) {
          result.dimension3 = category;
          result.confidence.dimension3 = 0.8;
          matchedKeywordsList.push({
            category: 'dimension3',
            keyword: keyword,
            result: category
          });
          matched = true;
          break;
        }
      }
      if (matched) break;
    }

    result.matchedKeywords = matchedKeywordsList;
    return result;
  };

  // 学习新关键词（增强版）
  const learnNewKeyword = (keyword, category, efficacy) => {
    const validation = validateKeywordForEfficacy(keyword, efficacy, category);
    
    if (!validation.isValid) {
      setValidationMessage({
        type: 'error',
        message: `关键词 "${keyword}" 与现有分类存在冲突：${validation.conflicts.map(c => c.efficacy).join(', ')}`
      });
      return false;
    }

    if (validation.warnings.length > 0) {
      const warningMsg = validation.warnings.map(w => w.message).join('; ');
      if (!confirm(`警告：${warningMsg}\n\n确定要继续添加吗？`)) {
        return false;
      }
    }

    setLearningData(prev => {
      const newData = { ...prev };
      
      // 确保类别结构存在
      if (!newData.newKeywords) {
        newData.newKeywords = { 功效: {}, 类型: {}, 持续性: {} };
      }
      if (!newData.newKeywords[category]) {
        newData.newKeywords[category] = {};
      }
      if (!newData.newKeywords[category][efficacy]) {
        newData.newKeywords[category][efficacy] = [];
      }
      
      if (!newData.newKeywords[category][efficacy].includes(keyword)) {
        newData.newKeywords[category][efficacy].push(keyword);
        // 初始化关键词得分
        newData.keywordScores[keyword] = 1;
      }
      
      return newData;
    });

    setValidationMessage({
      type: 'success',
      message: `成功添加关键词 "${keyword}" 到 ${efficacy}`
    });
    
    return true;
  };

  // 用户纠正分析结果（增强版）
  const correctAnalysis = (resultId, dimension, oldValue, newValue, userKeyword = null) => {
    setLearningData(prev => {
      const newData = { ...prev };
      
      // 记录纠正信息
      newData.corrections.push({
        resultId,
        dimension,
        oldValue,
        newValue,
        userKeyword,
        timestamp: new Date().toISOString()
      });
      
      // 更新相关关键词的得分
      const result = analysisResults.find(r => r.id === resultId);
      if (result) {
        result.matchedKeywords.forEach(mk => {
          if (mk.category === dimension) {
            // 降低错误匹配的关键词得分
            const currentScore = newData.keywordScores[mk.keyword] || 1;
            newData.keywordScores[mk.keyword] = Math.max(0, currentScore - 0.2);
          }
        });
      }
      
      // 如果用户提供了新关键词，学习它
      if (userKeyword && userKeyword.trim()) {
        const category = dimension === 'dimension1' ? '功效' : 
                        dimension === 'dimension2' ? '类型' : '持续性';
        
        const validation = validateKeywordForEfficacy(userKeyword.trim(), newValue, category);
        
        if (validation.isValid) {
          if (!newData.newKeywords[category]) {
            newData.newKeywords[category] = {};
          }
          if (!newData.newKeywords[category][newValue]) {
            newData.newKeywords[category][newValue] = [];
          }
          
          if (!newData.newKeywords[category][newValue].includes(userKeyword.trim())) {
            newData.newKeywords[category][newValue].push(userKeyword.trim());
            newData.keywordScores[userKeyword.trim()] = 1;
          }
        } else {
          // 记录冲突
          newData.conflictLog.push({
            keyword: userKeyword.trim(),
            attemptedEfficacy: newValue,
            conflicts: validation.conflicts,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      return newData;
    });

    // 更新分析结果
    setAnalysisResults(prev => prev.map(result => 
      result.id === resultId ? { ...result, [dimension]: newValue } : result
    ));
  };

  // 移除学习的关键词
  const removeLearnedKeyword = (category, efficacy, keyword) => {
    setLearningData(prev => {
      const newData = { ...prev };
      
      // 从活跃关键词中移除
      if (newData.newKeywords[category]?.[efficacy]) {
        newData.newKeywords[category][efficacy] = 
          newData.newKeywords[category][efficacy].filter(k => k !== keyword);
      }
      
      // 添加到已移除列表
      const key = `${category}-${efficacy}`;
      if (!newData.removedKeywords[key]) {
        newData.removedKeywords[key] = [];
      }
      newData.removedKeywords[key].push(keyword);
      
      // 清除得分
      delete newData.keywordScores[keyword];
      
      return newData;
    });
    
    setValidationMessage({
      type: 'success',
      message: `已移除关键词 "${keyword}"`
    });
  };

  // 智能建议新关键词
  const suggestKeywords = (text, currentResult) => {
    const suggestions = [];
    const words = text.toLowerCase().split(/[\s,，。！!？?；;：:]+/).filter(w => w.length > 1);
    
    words.forEach(word => {
      let isMatched = false;
      Object.values(keywordMapping).forEach(categoryMap => {
        Object.keys(categoryMap).forEach(pattern => {
          if (new RegExp(pattern, 'i').test(word)) {
            isMatched = true;
          }
        });
      });
      
      if (!isMatched && word.length > 2) {
        suggestions.push(word);
      }
    });
    
    return suggestions.slice(0, 5);
  };

  const handleAutoAnalysis = () => {
    if (!inputText.trim()) {
      alert('请输入宣称内容');
      return;
    }

    const lines = inputText.split('\n').filter(line => line.trim());
    const results = lines.map((line, index) => {
      const analysis = analyzeText(line.trim());
      return {
        id: Date.now() + index,
        text: line.trim(),
        ...analysis,
        timestamp: new Date().toLocaleString(),
        suggestedKeywords: suggestKeywords(line.trim(), analysis)
      };
    });

    setAnalysisResults(results);
  };

  const clearResults = () => {
    if (confirm('确定要清空所有分析结果吗？')) {
      setAnalysisResults([]);
      setInputText('');
    }
  };

  // 导出为Excel
  const exportToExcel = () => {
    if (analysisResults.length === 0) {
      alert('没有可导出的数据');
      return;
    }

    const worksheetData = [
      ['序号', '宣称内容', '维度一(功效)', '维度二(类型)', '维度三(持续性)', '置信度', '分析时间'],
      ...analysisResults.map((result, index) => [
        index + 1,
        result.text,
        result.dimension1.join(', '),
        result.dimension2,
        result.dimension3,
        `${Math.round(result.confidence.dimension1 * 100)}%`,
        result.timestamp
      ])
    ];

    const learningStatsData = [
      ['学习统计', '数量'],
      ['用户纠正次数', learningData.corrections.length],
      ['新学习关键词', Object.values(learningData.newKeywords).reduce((total, category) => 
        total + Object.values(category).reduce((sum, keywords) => sum + keywords.length, 0), 0
      )],
      ['冲突记录', learningData.conflictLog.length],
      ['已移除关键词', Object.values(learningData.removedKeywords).reduce((total, keywords) => total + keywords.length, 0)]
    ];

    const createTableHTML = (data, title) => {
      let html = `<table border="1" style="border-collapse: collapse; width: 100%; margin-bottom: 20px;">`;
      if (title) {
        html += `<tr><td colspan="${data[0]?.length || 1}" style="background-color: #4F46E5; color: white; font-weight: bold; padding: 10px; text-align: center; font-size: 16px;">${title}</td></tr>`;
      }
      
      data.forEach((row, index) => {
        html += '<tr>';
        row.forEach((cell) => {
          const isHeader = index === 0 && title !== '学习统计';
          const style = isHeader 
            ? 'background-color: #F3F4F6; font-weight: bold; padding: 8px; text-align: center;'
            : 'padding: 8px; vertical-align: top;';
          html += `<td style="${style}">${cell || ''}</td>`;
        });
        html += '</tr>';
      });
      html += '</table>';
      return html;
    };

    const htmlContent = `
      <html>
        <head>
          <meta charset="utf-8">
          <title>智能化妆品宣称分析报告</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #4F46E5; text-align: center; margin-bottom: 30px; }
            table { font-size: 12px; }
            .date { text-align: center; color: #6B7280; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>🧠 智能化妆品宣称分析报告</h1>
          <div class="date">生成时间：${new Date().toLocaleString()}</div>
          
          ${createTableHTML(worksheetData, '智能分析结果')}
          ${createTableHTML(learningStatsData, '学习统计')}
          
          <div style="margin-top: 30px; text-align: center; color: #6B7280; font-size: 12px;">
            <p>本报告由智能学习型化妆品宣称分析器自动生成</p>
            <p>系统具备自我学习和优化能力</p>
          </div>
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { 
      type: 'application/vnd.ms-excel;charset=utf-8' 
    });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `智能化妆品宣称分析报告_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const getStatistics = () => {
    if (analysisResults.length === 0) return null;
    
    const total = analysisResults.length;
    const dim1Stats = {};
    const dim2Stats = {};
    const dim3Stats = {};

    analysisResults.forEach(result => {
      result.dimension1.forEach(efficacy => {
        dim1Stats[efficacy] = (dim1Stats[efficacy] || 0) + 1;
      });
      dim2Stats[result.dimension2] = (dim2Stats[result.dimension2] || 0) + 1;
      dim3Stats[result.dimension3] = (dim3Stats[result.dimension3] || 0) + 1;
    });

    return { total, dim1Stats, dim2Stats, dim3Stats };
  };

  const stats = getStatistics();

  // 获取当前有效的关键词映射
  const keywordMapping = getDynamicKeywordMapping();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* 标题区域 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4 flex items-center justify-center gap-3">
              <Brain className="text-blue-600 h-10 w-10" />
              智能学习型化妆品宣称分析器
              <Sparkles className="text-purple-600 h-10 w-10" />
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
              🧠 AI自我学习优化 | 💡 多功效智能识别 | 📊 置信度评估 | 🎯 用户纠错学习 | 💾 数据持久化存储
            </p>
            {lastSaveTime && (
              <p className="text-sm text-gray-500 mt-2">
                最后保存时间: {lastSaveTime.toLocaleString()}
              </p>
            )}
          </div>

          {/* 数据管理按钮 */}
          <div className="flex flex-wrap gap-3 justify-center mb-6">
            <button
              onClick={saveLearningData}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              <Save size={16} />
              手动保存
            </button>
            <button
              onClick={exportLearningData}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Download size={16} />
              导出数据
            </button>
            <label className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm cursor-pointer">
              <Upload size={16} />
              导入数据
              <input
                type="file"
                accept=".json"
                onChange={importLearningData}
                className="hidden"
              />
            </label>
            <button
              onClick={clearLearningData}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              <XCircle size={16} />
              清空数据
            </button>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoSaveEnabled}
                onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                className="rounded"
              />
              自动保存
            </label>
          </div>

          {/* 验证消息 */}
          {validationMessage.message && (
            <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
              validationMessage.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
            }`}>
              {validationMessage.type === 'error' ? <XCircle size={20} /> : <CheckCircle size={20} />}
              {validationMessage.message}
            </div>
          )}

          {/* 输入区域 */}
          <div className="mb-8">
            <label className="block text-lg font-semibold text-gray-700 mb-4">
              📝 宣称内容输入 
              <span className="text-red-500 ml-1">*</span>
              <span className="text-gray-500 text-sm font-normal ml-3">（每行一个宣称，AI会持续学习优化）</span>
            </label>
            <div className="relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="请输入宣称内容，每行一个宣称，例如：&#10;&#10;该产品24小时长效保湿，温和不刺激&#10;含有玻尿酸和胶原蛋白，深层滋润紧致肌肤&#10;即刻提亮肌肤，焕发光彩，持久美白&#10;质地丝滑好推开，温和亲肤无刺激&#10;90%用户满意度调查，持续使用效果更佳&#10;美容修饰效果显著，妆容持久不脱妆&#10;&#10;学习新关键词示例：&#10;1. 在学习面板添加 '神经酰胺' → '修护'&#10;2. 然后分析 '含有神经酰胺成分' 将识别为修护功效"
                className="w-full p-6 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 resize-none bg-gray-50/50 backdrop-blur-sm"
                rows="12"
              />
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={handleAutoAnalysis}
              className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 font-semibold"
            >
              <Sparkles size={24} />
              智能分析
            </button>
            <button
              onClick={clearResults}
              className="flex items-center gap-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white px-8 py-4 rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 font-semibold"
            >
              <RotateCcw size={24} />
              清空结果
            </button>
            <button
              onClick={exportToExcel}
              disabled={analysisResults.length === 0}
              className="flex items-center gap-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none font-semibold"
            >
              <Download size={24} />
              导出Excel
            </button>
            <button
              onClick={() => setShowLearningPanel(!showLearningPanel)}
              className="flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 font-semibold"
            >
              <Brain size={24} />
              学习面板
            </button>
          </div>
        </div>

        {/* 学习面板 */}
        {showLearningPanel && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <Brain className="text-purple-600" />
              AI学习面板
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 学习统计 */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-xl">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  学习统计
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">用户纠正次数</span>
                    <span className="font-bold text-purple-600">{learningData.corrections.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">新学习关键词</span>
                    <span className="font-bold text-indigo-600">
                      {Object.values(learningData.newKeywords).reduce((total, category) => 
                        total + Object.values(category).reduce((sum, keywords) => sum + keywords.length, 0), 0
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">冲突记录</span>
                    <span className="font-bold text-orange-600">{learningData.conflictLog.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">已移除关键词</span>
                    <span className="font-bold text-red-600">
                      {Object.values(learningData.removedKeywords).reduce((total, keywords) => total + keywords.length, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">学习准确率</span>
                    <span className="font-bold text-green-600">
                      {learningData.corrections.length > 0 ? 
                        Math.round((1 - learningData.conflictLog.length / learningData.corrections.length) * 100) + '%' : 
                        '100%'
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* 学习到的新关键词 */}
              <div className="bg-gradient-to-br from-green-50 to-teal-50 p-6 rounded-xl">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  学习到的新关键词
                  <button
                    onClick={() => {
                      const mapping = getDynamicKeywordMapping();
                      
                      // 验证学习的关键词是否在映射中
                      let verificationReport = '映射验证报告:\n\n';
                      Object.entries(learningData.newKeywords).forEach(([category, efficacies]) => {
                        Object.entries(efficacies).forEach(([efficacy, keywords]) => {
                          const removedList = learningData.removedKeywords[`${category}-${efficacy}`] || [];
                          const activeKeywords = keywords.filter(kw => !removedList.includes(kw));
                          
                          activeKeywords.forEach(keyword => {
                            let found = false;
                            const patterns = Object.entries(mapping[category] || {});
                            for (const [pattern, eff] of patterns) {
                              if (eff === efficacy && pattern.includes(keyword)) {
                                found = true;
                                break;
                              }
                            }
                            verificationReport += `${keyword} → ${efficacy}: ${found ? '✓ 已添加' : '✗ 未找到'}\n`;
                          });
                        });
                      });
                      
                      console.log('详细映射信息:', {
                        mapping,
                        learningData: learningData.newKeywords,
                        removedKeywords: learningData.removedKeywords
                      });
                      
                      alert(verificationReport);
                    }}
                    className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                  >
                    验证映射
                  </button>
                </h3>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {Object.entries(learningData.newKeywords).map(([category, keywords]) => 
                    Object.entries(keywords).map(([efficacy, keywordList]) => {
                      const removedKeywords = learningData.removedKeywords[`${category}-${efficacy}`] || [];
                      const activeKeywords = keywordList.filter(kw => !removedKeywords.includes(kw));
                      
                      if (activeKeywords.length === 0) return null;
                      
                      return (
                        <div key={`${category}-${efficacy}`} className="text-sm border-b pb-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-700">{efficacy}:</span>
                            <span className="text-xs text-gray-500">({category})</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {activeKeywords.map((keyword, idx) => {
                              const score = learningData.keywordScores[keyword] || 1;
                              return (
                                <div key={idx} className="flex items-center gap-1">
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    score > 0.7 ? 'bg-green-100 text-green-800' : 
                                    score > 0.4 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {keyword} ({Math.round(score * 100)}%)
                                  </span>
                                  <button
                                    onClick={() => removeLearnedKeyword(category, efficacy, keyword)}
                                    className="text-red-500 hover:text-red-700"
                                    title="移除关键词"
                                  >
                                    <XCircle size={16} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  ).filter(Boolean)}
                  {Object.keys(learningData.newKeywords).length === 0 && (
                    <p className="text-gray-500 text-sm">暂无学习到的新关键词</p>
                  )}
                </div>
              </div>
            </div>

            {/* 冲突日志 */}
            {learningData.conflictLog.length > 0 && (
              <div className="mt-6 bg-gradient-to-br from-red-50 to-orange-50 p-6 rounded-xl">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  冲突记录
                </h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {learningData.conflictLog.slice(-5).map((log, idx) => (
                    <div key={idx} className="text-sm bg-white/60 p-2 rounded">
                      <span className="text-red-600 font-medium">"{log.keyword}"</span>
                      <span className="text-gray-600"> 尝试添加到 </span>
                      <span className="font-medium">{log.attemptedEfficacy}</span>
                      <span className="text-gray-600"> 但与 </span>
                      <span className="text-orange-600">{log.conflicts.map(c => c.efficacy).join(', ')}</span>
                      <span className="text-gray-600"> 冲突</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 添加新关键词 */}
            <div className="mt-6 bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Target className="h-5 w-5" />
                手动添加关键词
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  type="text"
                  value={newKeywordInput}
                  onChange={(e) => setNewKeywordInput(e.target.value)}
                  placeholder="输入新关键词"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <select 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">选择类型</option>
                  <option value="功效">功效</option>
                  <option value="类型">类型</option>
                  <option value="持续性">持续性</option>
                </select>
                <select 
                  value={selectedEfficacy}
                  onChange={(e) => setSelectedEfficacy(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">选择分类</option>
                  {selectedCategory === '功效' && dimension1Options.map(opt => (
                    <option key={opt.code} value={opt.value}>{opt.value}</option>
                  ))}
                  {selectedCategory === '类型' && dimension2Options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.value}</option>
                  ))}
                  {selectedCategory === '持续性' && dimension3Options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.value}</option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    if (newKeywordInput.trim() && selectedCategory && selectedEfficacy) {
                      if (learnNewKeyword(newKeywordInput.trim(), selectedCategory, selectedEfficacy)) {
                        setNewKeywordInput('');
                      }
                    } else {
                      setValidationMessage({
                        type: 'error',
                        message: '请填写所有字段'
                      });
                    }
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 justify-center"
                >
                  <Shield size={16} />
                  智能添加
                </button>
              </div>
              
              {/* 关键词测试工具 */}
              <div className="mt-4 p-4 bg-white/50 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  快速测试
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="输入测试文本"
                    className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const testText = e.target.value;
                        if (testText) {
                          const result = analyzeText(testText);
                          alert(`分析结果:\n功效: ${result.dimension1.join(', ')}\n类型: ${result.dimension2}\n持续性: ${result.dimension3}\n\n匹配的关键词:\n${result.matchedKeywords.map(mk => `"${mk.keyword}" → ${mk.result}`).join('\n')}`);
                        }
                      }
                    }}
                  />
                  <span className="text-xs text-gray-500 self-center">按回车测试</span>
                </div>
                
                <div className="mt-2 text-xs text-gray-600">
                  <strong>测试示例:</strong>
                  <div className="mt-1 space-y-1">
                    <div>1. 添加关键词 "神经酰胺" → "修护"</div>
                    <div>2. 测试文本 "含有神经酰胺成分"</div>
                    <div>3. 应识别为"修护"功效</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 统计信息 */}
        {stats && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <BarChart3 className="text-blue-600" />
              智能分析统计
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl text-white shadow-lg">
                <div className="text-3xl font-bold mb-2">{stats.total}</div>
                <div className="text-blue-100 font-medium">总宣称数</div>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl text-white shadow-lg">
                <div className="text-lg font-semibold mb-3">功效分布 TOP5</div>
                <div className="space-y-2 text-sm">
                  {Object.entries(stats.dim1Stats)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="truncate mr-2">{key}</span>
                      <span className="font-bold bg-white/20 px-2 py-1 rounded">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-gradient-to-br from-yellow-500 to-orange-500 p-6 rounded-xl text-white shadow-lg">
                <div className="text-lg font-semibold mb-3">类型分布</div>
                <div className="space-y-2 text-sm">
                  {Object.entries(stats.dim2Stats)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 4)
                    .map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="truncate mr-2">{key}</span>
                      <span className="font-bold bg-white/20 px-2 py-1 rounded">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl text-white shadow-lg">
                <div className="text-lg font-semibold mb-3">AI学习状态</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span>学习次数</span>
                    <span className="font-bold bg-white/20 px-2 py-1 rounded">{learningData.corrections.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>新关键词</span>
                    <span className="font-bold bg-white/20 px-2 py-1 rounded">
                      {Object.values(learningData.newKeywords).reduce((total, category) => 
                        total + Object.values(category).reduce((sum, keywords) => sum + keywords.length, 0), 0
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>准确率</span>
                    <span className="font-bold bg-white/20 px-2 py-1 rounded">
                      {learningData.corrections.length > 0 ? 
                        Math.round((1 - learningData.conflictLog.length / learningData.corrections.length) * 100) + '%' : 
                        '100%'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 分析结果表格 */}
        {analysisResults.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <TrendingUp className="text-green-600" />
              智能分析结果 
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1 rounded-full text-lg font-bold">
                {analysisResults.length}
              </span>
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white rounded-xl overflow-hidden shadow-lg">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <th className="border-b-2 border-gray-200 px-6 py-4 text-left font-bold text-gray-700">序号</th>
                    <th className="border-b-2 border-gray-200 px-6 py-4 text-left font-bold text-gray-700">宣称内容</th>
                    <th className="border-b-2 border-gray-200 px-6 py-4 text-left font-bold text-gray-700">维度一：功效</th>
                    <th className="border-b-2 border-gray-200 px-6 py-4 text-left font-bold text-gray-700">维度二：类型</th>
                    <th className="border-b-2 border-gray-200 px-6 py-4 text-left font-bold text-gray-700">维度三：持续性</th>
                    <th className="border-b-2 border-gray-200 px-6 py-4 text-left font-bold text-gray-700">置信度</th>
                  </tr>
                </thead>
                <tbody>
                  {analysisResults.map((result, index) => (
                    <tr key={result.id} className="hover:bg-blue-50/50 transition-colors duration-200 border-b border-gray-100">
                      <td className="px-6 py-4 text-sm font-medium text-gray-600">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm max-w-xs">
                        <div className="break-words leading-relaxed text-gray-800">{result.text}</div>
                        {/* 显示匹配的关键词 */}
                        {result.matchedKeywords && result.matchedKeywords.length > 0 && (
                          <div className="mt-2 p-2 bg-gray-50 rounded">
                            <span className="text-xs text-gray-600 font-semibold">匹配详情:</span>
                            <div className="mt-1 space-y-1">
                              {result.matchedKeywords.map((mk, idx) => (
                                <div key={idx} className="text-xs flex items-center gap-1">
                                  <span className={`px-1 py-0.5 rounded ${
                                    mk.category === 'dimension1' ? 'bg-blue-50' :
                                    mk.category === 'dimension2' ? 'bg-green-50' :
                                    'bg-purple-50'
                                  }`}>
                                    {mk.category === 'dimension1' ? '功效' :
                                     mk.category === 'dimension2' ? '类型' : '持续性'}
                                  </span>
                                  <span className="text-blue-600 font-medium">"{mk.keyword}"</span>
                                  <span className="text-gray-500">→</span>
                                  <span className={`inline-block px-2 py-0.5 rounded ${
                                    mk.category === 'dimension1' ? getEfficacyColor(mk.result) :
                                    mk.category === 'dimension2' ? getDimension2Color(mk.result) :
                                    getDimension3Color(mk.result)
                                  }`}>
                                    {mk.result}
                                  </span>
                                  {mk.score !== undefined && (
                                    <span className={`ml-1 ${
                                      mk.score > 0.7 ? 'text-green-600' : 
                                      mk.score > 0.4 ? 'text-yellow-600' : 'text-red-600'
                                    }`}>
                                      ({Math.round(mk.score * 100)}%)
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {(!result.matchedKeywords || result.matchedKeywords.length === 0) && (
                          <div className="mt-2 text-xs text-gray-500 italic">
                            未匹配到任何关键词
                          </div>
                        )}
                        {result.suggestedKeywords && result.suggestedKeywords.length > 0 && (
                          <div className="mt-2">
                            <span className="text-xs text-gray-500">建议关键词: </span>
                            {result.suggestedKeywords.map((keyword, idx) => (
                              <span key={idx} className="bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded text-xs mr-1">
                                {keyword}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-wrap gap-2">
                          {result.dimension1.map((efficacy, idx) => (
                            <span
                              key={idx}
                              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getEfficacyColor(efficacy)}`}
                            >
                              {efficacy}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getDimension2Color(result.dimension2)}`}>
                          {result.dimension2}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getDimension3Color(result.dimension3)}`}>
                          {result.dimension3}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-12 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full" 
                              style={{width: `${result.confidence.dimension1 * 100}%`}}
                            ></div>
                          </div>
                          <span className="text-xs font-medium">
                            {Math.round(result.confidence.dimension1 * 100)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 功效类别参考表 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <Eye className="text-indigo-600" />
            功效类别参考表
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white rounded-xl overflow-hidden shadow-lg">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <th className="border-b-2 border-gray-200 px-4 py-3 text-left font-bold text-gray-700">编号</th>
                  <th className="border-b-2 border-gray-200 px-4 py-3 text-left font-bold text-gray-700">功效类别</th>
                  <th className="border-b-2 border-gray-200 px-4 py-3 text-left font-bold text-gray-700">释义说明</th>
                </tr>
              </thead>
              <tbody>
                {dimension1Options.map((option) => (
                  <tr key={option.code} className="hover:bg-blue-50/50 transition-colors duration-200 border-b border-gray-100">
                    <td className="px-4 py-3 font-mono font-bold text-indigo-600">{option.code}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${option.color}`}>
                        {option.value}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 leading-relaxed">{option.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartClaimsAnalyzer;