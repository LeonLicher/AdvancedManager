// src/types/DeviceInfo.ts
export interface DeviceInfo {
    userAgent: string
    platform: string
    language: string
    screenWidth: number
    screenHeight: number
    timezone: string
    [key: string]: any // Allow additional properties if needed
}
