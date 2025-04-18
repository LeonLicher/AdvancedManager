import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useHttpClient } from '../HttpClientContext'
import { Activity, ActivityFeedResponse, ActivityType } from './Activity'
import './ActivityFeed.css'
import { Comment, CommentsResponse } from './Comment/CommentTypes'
import Comments from './Comment/Comments'

interface ActivityItemProps {
    activity: Activity
    leagueId: string
    onCommentClick: (activityId: string) => void
    showComments: boolean
    comments: Comment[]
    isLoadingComments: boolean
}

const ActivityItem: React.FC<ActivityItemProps> = ({
    activity,
    leagueId,
    onCommentClick,
    showComments,
    comments,
    isLoadingComments,
}) => {
    const httpClient = useHttpClient()

    const getTimeAgo = (dateStr: string) => {
        const now = new Date()
        const past = new Date(dateStr)
        const diffInHours = Math.floor(
            (now.getTime() - past.getTime()) / (1000 * 60 * 60)
        )

        if (diffInHours == 0) {
            const diffInMinutes = Math.floor(
                (now.getTime() - past.getTime()) / (1000 * 60)
            )
            if (diffInMinutes < 2) {
                return `Gerade eben`
            } else {
                return `Vor ${diffInMinutes} Minuten`
            }
        }

        if (diffInHours < 24) {
            return `Vor ${diffInHours} Stunden`
        } else {
            return `Vor ${Math.floor(diffInHours / 24)} Tagen`
        }
    }

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 0,
        }).format(price)
    }

    const renderActivityContent = () => {
        if (ActivityType.isMarketActivity(activity)) {
            return (
                <div className="activity-item">
                    <div className="activity-image-container">
                        <img
                            src={httpClient.getPlayerImageUrl(activity.data.pi)}
                            alt={`${activity.data.fn} ${activity.data.ln}`}
                            className="activity-player-image"
                            onError={(e) => {
                                if (
                                    !httpClient.usedPlayerIds.has(
                                        activity.data.pi
                                    )
                                ) {
                                    httpClient.usedPlayerIds.add(
                                        activity.data.pi
                                    )
                                    e.currentTarget.src = `https://kickbase.b-cdn.net/pool/playersbig/${activity.data.pi}.png`
                                }
                            }}
                        />
                    </div>
                    <div className="activity-content-wrapper">
                        <div className="activity-row activity-row-primary">
                            <div className="activity-title">
                                {activity.data.ln.toUpperCase()}
                            </div>
                            <div className="activity-price">
                                {formatPrice(activity.data.mv)}
                            </div>
                            <div
                                className="activity-comments"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onCommentClick(activity.i)
                                }}
                            >
                                {renderCommentCount(activity.coc)}
                            </div>
                        </div>
                        <div className="activity-row activity-row-secondary">
                            <div className="activity-subtitle">
                                Neu auf dem Transfermarkt •{' '}
                                {getTimeAgo(activity.dt)}
                            </div>
                        </div>
                    </div>
                </div>
            )
        }

        if (ActivityType.isTransferActivity(activity)) {
            const isBuy = activity.data.t === 1
            return (
                <div className="activity-item">
                    <div className="activity-image-container">
                        <img
                            src={httpClient.getPlayerImageUrl(activity.data.pi)}
                            alt={activity.data.pn}
                            className="activity-player-image"
                            onError={(e) => {
                                if (
                                    !httpClient.usedPlayerIds.has(
                                        activity.data.pi
                                    )
                                ) {
                                    httpClient.usedPlayerIds.add(
                                        activity.data.pi
                                    )
                                    e.currentTarget.src = `https://kickbase.b-cdn.net/pool/playersbig/${activity.data.pi}.png`
                                }
                            }}
                        />
                    </div>
                    <div className="activity-content-wrapper">
                        <div className="activity-row activity-row-primary">
                            <div className="activity-title-price">
                                <div className="activity-title">
                                    {activity.data.pn.toUpperCase()}
                                </div>
                                <div
                                    className={`activity-price ${isBuy ? 'buy' : 'sell'}`}
                                >
                                    {formatPrice(activity.data.trp)}
                                </div>
                            </div>
                            <div
                                className="activity-comments"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onCommentClick(activity.i)
                                }}
                            >
                                {renderCommentCount(activity.coc)}
                            </div>
                        </div>
                        <div className="activity-row activity-row-secondary">
                            <div className="activity-subtitle">
                                {isBuy
                                    ? `Gekauft von ${activity.data.byr}`
                                    : `Verkauft von ${activity.data.slr}`}{' '}
                                •{getTimeAgo(activity.dt)}
                            </div>
                        </div>
                    </div>
                </div>
            )
        }

        if (ActivityType.isDailyBonusActivity(activity)) {
            return (
                <div className="activity-item">
                    <div className="activity-icon trophy-icon">👑</div>
                    <div className="activity-content">
                        <div className="activity-title">TAGESBONUS</div>
                        <div className="activity-subtitle">
                            {formatPrice(activity.data.bn)} •{' '}
                            {getTimeAgo(activity.dt)}
                        </div>
                    </div>
                    <div
                        className="activity-comments"
                        onClick={(e) => {
                            e.stopPropagation()
                            onCommentClick(activity.i)
                        }}
                    >
                        {renderCommentCount(activity.coc)}
                    </div>
                </div>
            )
        }

        if (ActivityType.isAchievementActivity(activity)) {
            return (
                <div className="activity-item">
                    <div className="activity-icon achievement-icon">🏆</div>
                    <div className="activity-content">
                        <div className="activity-title">{activity.data.n}</div>
                        <div className="activity-subtitle">
                            {activity.data.d} • {getTimeAgo(activity.dt)}
                        </div>
                    </div>
                    <div
                        className="activity-comments"
                        onClick={(e) => {
                            e.stopPropagation()
                            onCommentClick(activity.i)
                        }}
                    >
                        {renderCommentCount(activity.coc)}
                    </div>
                </div>
            )
        }

        return null
    }

    const renderCommentCount = (commentCount: number) => {
        return (
            <div
                className={`activity-comments ${commentCount > 0 ? 'has-comments' : ''} ${showComments ? 'active' : ''}`}
                onClick={(e) => {
                    e.stopPropagation()
                    onCommentClick(activity.i)
                }}
            >
                <svg
                    className="comment-icon"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M21 11.5C21 16.1944 16.9706 20 12 20C10.8885 20 9.82375 19.8325 8.83386 19.5222C8.64517 19.4626 8.44118 19.4523 8.24665 19.4925L5.60829 20.0926C4.71607 20.2733 3.92757 19.4847 4.10829 18.5925L4.70837 15.9542C4.74854 15.7596 4.73821 15.5556 4.67866 15.367C4.36837 14.3771 4.2 13.3123 4.2 12.2C4.2 7.50558 8.22944 3.7 13.2 3.7C15.8297 3.7 18.1997 4.77395 19.8003 6.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                </svg>
                <span className="comment-count">{commentCount}</span>
            </div>
        )
    }

    return (
        <div className="activity-item-wrapper">
            {renderActivityContent()}
            {showComments && (
                <Comments
                    activityId={activity.i}
                    leagueId={leagueId}
                    comments={comments}
                    isLoading={isLoadingComments}
                    onCommentPosted={() => onCommentClick(activity.i)}
                />
            )}
        </div>
    )
}

const ITEMS_PER_PAGE = 26

const ActivityFeed: React.FC<{ leagueId: string }> = ({ leagueId }) => {
    const [activities, setActivities] = useState<Activity[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedActivityId, setSelectedActivityId] = useState<string | null>(
        null
    )
    const [comments, setComments] = useState<Comment[]>([])
    const [loadingComments, setLoadingComments] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const [page, setPage] = useState(0)
    const [loadingMore, setLoadingMore] = useState(false)

    const observer = useRef<IntersectionObserver>()
    const lastActivityRef = useCallback(
        (node: HTMLDivElement) => {
            if (loading || loadingMore) return

            if (observer.current) observer.current.disconnect()

            observer.current = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && hasMore) {
                    setPage((prevPage) => prevPage + 1)
                }
            })

            if (node) observer.current.observe(node)
        },
        [loading, loadingMore, hasMore]
    )

    const httpClient = useHttpClient()

    const fetchActivities = async (
        pageNumber: number,
        isInitial: boolean = false
    ) => {
        if (!isInitial && (!hasMore || loadingMore)) return

        const start = pageNumber * ITEMS_PER_PAGE

        try {
            setLoadingMore(true)
            const response = await httpClient.get<ActivityFeedResponse>(
                `/v4/leagues/${leagueId}/activitiesFeed?max=${ITEMS_PER_PAGE}&start=${start}`
            )

            if (response.af.length < ITEMS_PER_PAGE) {
                setHasMore(false)
            }

            setActivities((prev) =>
                isInitial ? response.af : [...prev, ...response.af]
            )
            setError(null)
        } catch (err) {
            setError('Failed to fetch activities')
            console.error('Error fetching activities:', err)
        } finally {
            setLoading(false)
            setLoadingMore(false)
        }
    }

    useEffect(() => {
        setLoading(true)
        setHasMore(true)
        setPage(0)
        setActivities([])
        fetchActivities(0, true)
    }, [leagueId])

    useEffect(() => {
        if (page > 0) {
            fetchActivities(page)
        }
    }, [page])

    const handleCommentClick = async (activityId: string) => {
        if (selectedActivityId === activityId) {
            setSelectedActivityId(null)
            setComments([])
            return
        }

        setSelectedActivityId(activityId)
        setLoadingComments(true)
        console.log('Fetching comments for activity:', activityId)
        try {
            const response = await httpClient.get<CommentsResponse>(
                `/v4/leagues/${leagueId}/activitiesFeed/${activityId}/comments?max=10&start=0`
            )
            console.log('Comments response:', response)
            setComments(response.it || [])
        } catch (err) {
            console.error('Error fetching comments:', err)
            setComments([])
        } finally {
            setLoadingComments(false)
        }
    }

    if (loading) return <div className="loading">Loading...</div>
    if (error) return <div className="error">{error}</div>

    return (
        <div className="activity-feed">
            <h1 className="feed-title">LIGA-EREIGNISSE</h1>
            <div className="activities-list">
                {activities.map((activity, index) => (
                    <div
                        key={activity.i}
                        ref={
                            index === activities.length - 1
                                ? lastActivityRef
                                : undefined
                        }
                    >
                        <ActivityItem
                            activity={activity}
                            leagueId={leagueId}
                            onCommentClick={handleCommentClick}
                            showComments={selectedActivityId === activity.i}
                            comments={comments}
                            isLoadingComments={loadingComments}
                        />
                    </div>
                ))}
                {loadingMore && (
                    <div className="loading-more">
                        <div className="loading-spinner"></div>
                        Loading more activities...
                    </div>
                )}
            </div>
        </div>
    )
}

export default ActivityFeed
