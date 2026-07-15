const FALLBACK_BASE_URL = 'https://tubban1.oss-cn-beijing.aliyuncs.com/static/lib';

export const AGENT_DEMO_LIBRARY_REGISTRY = {
  lodash: {
    label: 'Lodash', category: 'utility', global: '_', priority: 5,
    src: 'https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js', fallback: 'lodash.min.js',
    usage: '用于模拟数据的分组、筛选、排序和防抖。'
  },
  dayjs: {
    label: 'Day.js', category: 'utility', global: 'dayjs', priority: 5,
    src: 'https://cdn.jsdelivr.net/npm/dayjs@1.11.21/dayjs.min.js', fallback: 'dayjs.min.js',
    usage: '用于执行轨迹、任务记录和业务时间格式化。'
  },
  vue: {
    label: 'Vue 3', category: 'framework', global: 'Vue', priority: 10,
    src: 'https://cdn.jsdelivr.net/npm/vue@3.5.39/dist/vue.global.prod.js', fallback: 'vue.global.prod.js',
    usage: '负责组件状态、场景切换、表单、弹窗和结果渲染。'
  },
  lucide: {
    label: 'Lucide', category: 'ui', global: 'lucide', priority: 15,
    src: 'https://cdn.jsdelivr.net/npm/lucide@1.23.0/dist/umd/lucide.min.js',
    usage: '使用 data-lucide 图标，并在 Vue 更新后调用 lucide.createIcons()。'
  },
  gsap: {
    label: 'GSAP', category: 'animation', global: 'gsap', priority: 20,
    src: 'https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js', fallback: 'gsap.min.js',
    usage: '用于步骤推进、状态变化和结果出现时的克制过渡动画。'
  },
  animejs: {
    label: 'Anime.js', category: 'animation', global: 'anime', priority: 20,
    src: 'https://cdn.jsdelivr.net/npm/animejs@3.2.2/lib/anime.min.js', fallback: 'anime.min.js',
    usage: '用于轻量 DOM、SVG 或 Canvas 补间动画。'
  },
  three: {
    label: 'Three.js', category: '3d', global: 'THREE', priority: 30,
    src: 'https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js', fallback: 'three.min.js',
    usage: '仅用于三维空间、数字孪生或产品结构类 Demo。'
  },
  fabric: {
    label: 'Fabric.js', category: 'graphics', global: 'fabric', priority: 30,
    src: 'https://cdn.jsdelivr.net/npm/fabric@6.7.0/dist/index.min.js', fallback: 'fabric.min.js',
    usage: '用于白板、标注、模板和可编辑 Canvas。'
  },
  konva: {
    label: 'Konva.js', category: 'graphics', global: 'Konva', priority: 30,
    src: 'https://cdn.jsdelivr.net/npm/konva@10.0.12/konva.min.js', fallback: 'konva.min.js',
    usage: '用于节点式流程、图层和舞台交互。'
  },
  phaser: {
    label: 'Phaser.js', category: 'game', global: 'Phaser', priority: 30,
    src: 'https://cdn.jsdelivr.net/npm/phaser@3.90.0/dist/phaser.min.js', fallback: 'phaser.min.js',
    usage: '仅用于游戏化训练或强交互模拟器。'
  },
  matter: {
    label: 'Matter.js', category: 'game', global: 'Matter', priority: 31,
    src: 'https://cdn.jsdelivr.net/npm/matter-js@0.20.0/build/matter.min.js', fallback: 'matter.min.js',
    usage: '用于物理模拟或碰撞交互。'
  },
  howler: {
    label: 'Howler.js', category: 'audio', global: 'Howler', priority: 40,
    src: 'https://cdn.jsdelivr.net/npm/howler@2.2.4/dist/howler.min.js', fallback: 'howler.min.js',
    usage: '仅用于需要模拟音频播放和音量控制的 Demo。'
  },
  tone: {
    label: 'Tone.js', category: 'audio', global: 'Tone', priority: 41,
    src: 'https://cdn.jsdelivr.net/npm/tone@15.2.12/build/Tone.min.js', fallback: 'Tone.min.js',
    usage: '仅用于音乐、节奏或合成音频场景。'
  },
  chartjs: {
    label: 'Chart.js', category: 'charts', global: 'Chart', priority: 50,
    src: 'https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js', fallback: 'chart.umd.min.js',
    usage: '用于常规趋势、构成和指标对比图表。'
  },
  echarts: {
    label: 'ECharts', category: 'charts', global: 'echarts', priority: 50,
    src: 'https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js', fallback: 'echarts.min.js',
    usage: '用于复杂仪表盘、联动图表和多维业务分析。'
  },
  d3: {
    label: 'D3.js', category: 'charts', global: 'd3', priority: 50,
    src: 'https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js', fallback: 'd3.min.js',
    usage: '仅用于关系网络、流程拓扑和高度定制的 SVG 可视化。'
  }
};

const BASE_LIBRARY_IDS = ['dayjs', 'vue', 'lucide'];
const MAX_LIBRARY_COUNT = 8;

const addLibraries = (selected, ...ids) => {
  for (const id of ids) {
    if (AGENT_DEMO_LIBRARY_REGISTRY[id]) selected.add(id);
  }
};

const collectSearchText = (value) => {
  if (Array.isArray(value)) return value.map(collectSearchText).join(' ');
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .filter(([key]) => key !== 'libraries')
      .map(([, item]) => collectSearchText(item))
      .join(' ');
  }
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
};

export function selectAgentDemoLibraryIds(spec = {}, extraContext = '') {
  const selected = new Set(BASE_LIBRARY_IDS);
  const explicit = Array.isArray(spec.libraries) ? spec.libraries : [];
  if (explicit.length) addLibraries(selected, ...explicit);

  const context = `${collectSearchText(spec)} ${collectSearchText(extraContext)}`.toLowerCase();
  const has = (pattern) => pattern.test(context);

  if (has(/数据|分析|指标|报表|报告|图表|可视化|趋势|预测|评分|画像|统计|经营|销售|转化|漏斗|排行|dashboard|analytics|metric|report|chart|visualization|forecast/)) {
    addLibraries(selected, 'lodash', 'chartjs');
  }
  if (has(/多维|联动|仪表盘|地图|热力|复杂图表|监控大屏|echarts/)) {
    selected.delete('chartjs');
    addLibraries(selected, 'lodash', 'echarts');
  }
  if (has(/关系图|关系网络|知识图谱|流程拓扑|组织网络|节点网络|d3/)) {
    selected.delete('chartjs');
    selected.delete('echarts');
    addLibraries(selected, 'lodash', 'd3');
  }
  if (has(/流程|审批|工单|任务|自动化|跟进|调度|客服|状态流转|workflow|approval|timeline/)) {
    addLibraries(selected, 'gsap');
  }
  if (has(/动画|动效|补间|animation|anime\.js/)) {
    addLibraries(selected, 'animejs');
  }
  if (has(/白板|画布|标注|海报|模板编辑|图形编辑|canvas editor|fabric/)) {
    addLibraries(selected, 'fabric');
  }
  if (has(/节点编辑|流程编排|舞台|图层|konva/)) {
    addLibraries(selected, 'konva');
  }
  if (has(/三维|3d|数字孪生|空间布局|立体|three\.js/)) {
    addLibraries(selected, 'three', 'gsap');
  }
  if (has(/语音|音频|播报|录音|audio|voice/)) {
    addLibraries(selected, 'howler');
  }
  if (has(/音乐|节奏|音序|合成器|music|tone\.js/)) {
    addLibraries(selected, 'tone');
  }
  if (has(/游戏|闯关|训练模拟器|game|phaser/)) {
    addLibraries(selected, 'phaser', 'matter');
  }

  return [...selected]
    .sort((left, right) => AGENT_DEMO_LIBRARY_REGISTRY[left].priority - AGENT_DEMO_LIBRARY_REGISTRY[right].priority)
    .slice(0, MAX_LIBRARY_COUNT);
}

export function resolveAgentDemoLibraries(spec = {}) {
  return selectAgentDemoLibraryIds(spec).map(id => ({
    id,
    ...AGENT_DEMO_LIBRARY_REGISTRY[id],
    fallbackSrc: AGENT_DEMO_LIBRARY_REGISTRY[id].fallback
      ? `${FALLBACK_BASE_URL}/${AGENT_DEMO_LIBRARY_REGISTRY[id].fallback}`
      : ''
  }));
}

export function withAgentDemoLibraries(spec = {}, extraContext = '') {
  return { ...spec, libraries: selectAgentDemoLibraryIds(spec, extraContext) };
}
