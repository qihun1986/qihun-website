/**
 * 统一数据获取函数
 * - 本地开发（npm run dev）：读 src/data/*.json
 * - 生产环境：动态加载 Supabase 客户端并查询数据库
 *
 * ★ 重要：使用动态 import 加载 Supabase，确保本地开发时完全不加载数据库模块
 */

export async function getData(
  table: string,
  columns: string = '*',
  options: {
    eq?: [string, any]
    neq?: [string, any]
    single?: boolean
    order?: [string, boolean] | [string, boolean][]
    limit?: number
    in?: [string, any[]]
    notNull?: string
  } = {}
) {
  // ── 本地开发模式 ──
  if (import.meta.env.DEV) { // ★ 强制本地模式，避免数据库查询。如需切换回自动判断，改为 import.meta.env.DEV
    let data: any[]

    try {
      const mod = await import(`../data/${table}.json`)
      data = Array.isArray(mod.default) ? mod.default : [mod.default]
    } catch {
      throw new Error(
        `[getData] 本地数据文件 src/data/${table}.json 不存在，请先下载本地数据再运行 npm run dev`
      )
    }

    // .not(col, 'is', null) → 过滤 null
    if (options.notNull) {
      data = data.filter((r: any) => r[options.notNull!] != null)
    }

    // .eq(key, value)
    if (options.eq) {
      const [k, v] = options.eq
      data = data.filter((r: any) => r[k] === v)
    }

    // .neq(key, value)
    if (options.neq) {
      const [k, v] = options.neq
      data = data.filter((r: any) => r[k] !== v)
    }

    // .in(col, values[])
    if (options.in) {
      const [col, vals] = options.in
      data = data.filter((r: any) => vals.includes(r[col]))
    }

    // .order(col, ascending) — 支持一次或多次
    if (options.order) {
      const orders = Array.isArray(options.order[0])
        ? (options.order as [string, boolean][])
        : [options.order as [string, boolean]]
      data = [...data].sort((a: any, b: any) => {
        for (const [col, asc = true] of orders) {
          const va = a[col], vb = b[col]
          let cmp: number
          if (typeof va === 'string' && typeof vb === 'string') {
            cmp = va.localeCompare(vb)
          } else {
            cmp = (va ?? 0) - (vb ?? 0)
          }
          if (cmp !== 0) return asc ? cmp : -cmp
        }
        return 0
      })
    }

    if (columns !== '*') {
      const fields = columns.split(',').map((s: string) => s.trim())
      data = data.map((row: any) => {
        const newRow: any = {}
        fields.forEach((f: string) => { newRow[f] = row[f] })
        return newRow
      })
    }

    if (options.limit != null) {
      data = data.slice(0, options.limit)
    }

    if (options.single) {
      return { data: data[0] ?? null, error: null }
    }

    return { data, error: null }
  }

  // ── 生产环境：动态加载 Supabase ──
  const { supabase } = await import('./supabase')
  let q = supabase.from(table).select(columns)

  if (options.notNull) {
    q = q.not(options.notNull, 'is', null)
  }
  if (options.eq) q = q.eq(options.eq[0], options.eq[1])
  if (options.neq) q = q.neq(options.neq[0], options.neq[1])
  if (options.in) q = q.in(options.in[0], options.in[1])
  if (options.order) {
    const orders = Array.isArray(options.order[0])
      ? (options.order as [string, boolean][])
      : [options.order as [string, boolean]]
    for (const [col, asc] of orders) {
      q = q.order(col, { ascending: asc ?? true })
    }
  }
  if (options.limit != null) q = q.limit(options.limit)
  if (options.single) q = q.single()

  return await q
}