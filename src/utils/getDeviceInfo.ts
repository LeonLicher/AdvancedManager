// src/utils/getDeviceInfo.ts
import { DeviceInfo } from '../types/DeviceInfo'

export const getDeviceInfo = (): DeviceInfo => {
    return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        // Add more properties if needed
    }
}
