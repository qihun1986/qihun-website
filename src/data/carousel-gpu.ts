// 显卡榜/显卡天梯轮播图共享数据
// 注意：数组顺序 = 显示顺序（第1个默认显示）
// 新内容添加到数组末尾，通过 currentIndex 控制默认显示最新的3个

export interface CarouselItem {
  image: string
  link: string
  title: string
}

export const carouselItems: CarouselItem[] = [
  { image: '/images/banner1.jpg', link: 'https://www.bilibili.com/video/BV1WhXjBDE5p', title: '5060TI、9070GRE~11款游戏对比横评！' },
  { image: '/images/banner2.jpg', link: 'https://www.bilibili.com/video/BV1L7dnBoE4p/', title: '2026.05二手显卡推荐！萌新适用，省钱避坑~' },
  { image: '/images/banner3.jpg', link: 'https://www.bilibili.com/', title: '显卡天梯图预告' }
]

// 默认显示最新的3个（数组最后3个）
// 如果数组长度 >= 3，默认从索引 carouselItems.length - 3 开始
export const getDefaultCarouselIndex = (): number => {
  const len = carouselItems.length
  return len >= 3 ? len - 3 : 0
}

// 轮播图自动播放间隔（毫秒）
export const AUTO_PLAY_INTERVAL = 5000
