import { getGaokaoDataCoverage } from '../data_coverage.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: '方法不允许' });

  const { province, year } = req.body || {};
  if (!province || !year) return res.status(400).json({ error: '缺少省份或年份' });

  try {
    const coverage = await getGaokaoDataCoverage({ province, year });
    return res.status(200).json({ success: true, coverage });
  } catch (error) {
    console.error('[Gaokao coverage]', error);
    return res.status(500).json({ error: '读取高考数据覆盖度失败' });
  }
}
