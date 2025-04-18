import React from 'react'
import HttpClient from './httpClient'

const HttpClientContext = React.createContext<HttpClient | null>(null)

export const HttpClientProvider = HttpClientContext.Provider
export const useHttpClient = () => {
    const context = React.useContext(HttpClientContext)
    if (!context) {
        throw new Error(
            'useHttpClient must be used within a HttpClientProvider'
        )
    }
    return context
}
