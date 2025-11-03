import { clsx, type ClassValue } from 'clsx'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 格式化时间，根据用户语言环境自动选择格式
 * @param dateString ISO 8601 格式的时间字符串
 * @returns 格式化后的时间字符串
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString)

  // 获取用户的语言环境（浏览器语言或系统语言）
  const userLocale =
    typeof navigator !== 'undefined'
      ? navigator.language || (navigator as any).userLanguage
      : 'en-US'

  // 判断是否为中文环境
  const isChineseLocale =
    userLocale.toLowerCase().startsWith('zh') ||
    userLocale.toLowerCase().includes('cn')

  if (isChineseLocale) {
    // 中文格式: "10月21日 21:54"
    return format(date, 'M月d日 HH:mm', { locale: zhCN })
  } else {
    // 英文格式: "Oct 21, 21:54" 或 "Oct 21 21:54"
    return format(date, 'MMM d, HH:mm')
  }
}
