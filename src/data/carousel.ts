// 顶部轮播图共享数据
// 注意：数组顺序 = 显示顺序（第1个默认显示）
// 新内容添加到数组末尾，通过 currentIndex 控制默认显示最新的3个

export interface CarouselItem {
  image: string
  link: string
  title: string
}

export const carouselItems: CarouselItem[] = [
  { image: '/images/banner1.jpg', link: 'https://www.bilibili.com/video/BV1zjoQBQEPR/', title: '26年5月二手CPU捡漏攻略！省钱避坑~' },
  { image: '/images/banner2.jpg', link: 'https://www.bilibili.com/video/BV1NcdaBMEWu/', title: '5600升级5500x3d,7500f值不值？省流推荐！' },
  { image: '/images/banner3.jpg', link: 'https://www.bilibili.com/video/BV1mch3zgEDY/', title: 'DDR5：4800~8000频率对比测试 / 有彩蛋' }
]

// 默认显示最新的3个（数组最后3个）
// 如果数组长度 >= 3，默认从索引 carouselItems.length - 3 开始
export const getDefaultCarouselIndex = (): number => {
  const len = carouselItems.length
  return len >= 3 ? len - 3 : 0
}

// 轮播图自动播放间隔（毫秒）
export const AUTO_PLAY_INTERVAL = 5000
