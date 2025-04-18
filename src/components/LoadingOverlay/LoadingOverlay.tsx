// src/components/LoadingOverlay/LoadingOverlay.tsx
import React from 'react'
import AnimatedFormationLoading from '../AnimatedFormationLoading/AnimatedFormationLoading'
import './LoadingOverlay.scss' // We'll create this next

interface LoadingOverlayProps {
    isLoading: boolean
    text?: string
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isLoading, text }) => {
    if (!isLoading) {
        return null // Don't render anything if not loading
    }

    return (
        <div className="loading-overlay">
            <div className="loading-overlay__content">
                <AnimatedFormationLoading isLoading={isLoading} text={text} />
            </div>
        </div>
    )
}

export default LoadingOverlay
