import React, { useState } from 'react';
import { useHttpClient } from '../../HttpClientContext';
import { Comment, CreateCommentRequest } from './CommentTypes';
import './Comments.css';

interface CommentsProps {
  activityId: string;
  leagueId: string;
  comments: Comment[];
  isLoading: boolean;
  onCommentPosted: () => void;
}

const Comments: React.FC<CommentsProps> = ({
  activityId,
  leagueId,
  comments,
  isLoading,
  onCommentPosted
}) => {
  const [newComment, setNewComment] = useState('');
  const httpClient = useHttpClient();

  const getTimeAgo = (dateStr: string) => {
    const now = new Date();
    const past = new Date(dateStr);
    const diffInHours = Math.floor((now.getTime() - past.getTime()) / (1000 * 60 * 60));

    if (diffInHours == 0) {
      const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60));
      if (diffInMinutes < 2) {
        return `Gerade eben`;
      } else {
        return `Vor ${diffInMinutes} Minuten`;
      }
    }

    if (diffInHours < 24) {
      return `Vor ${diffInHours} Stunden`;
    } else {
      return `Vor ${Math.floor(diffInHours / 24)} Tagen`;
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await httpClient.post<CreateCommentRequest>(
        `/v4/leagues/${leagueId}/activitiesFeed/${activityId}/comments`,
        { comm: newComment }
      );
      setNewComment('');
      onCommentPosted();
    } catch (err) {
      console.error('Error posting comment:', err);
    }
  };

  if (isLoading) {
    return <div className="comments-loading">Loading comments...</div>;
  }

  return (
    <div className="comments-container">
      <div className="comments-list">
        {comments && comments.length > 0 ? (
          comments.map((comment) => (
            <div key={comment.ui} className="comment-item">
              <div className="comment-header">
                <div className="comment-user">
                  {comment.prurl && (
                    <img 
                      src={comment.prurl} 
                      alt={comment.unm}
                      className="comment-user-image"
                    />
                  )}
                  <span className="comment-username">{comment.unm}</span>
                </div>
                <span className="comment-time">{getTimeAgo(comment.dt)}</span>
              </div>
              <div className="comment-text">{comment.comm}</div>
            </div>
          ))
        ) : (
          <div className="no-comments">No comments yet</div>
        )}
      </div>
      <form onSubmit={handleSubmitComment} className="comment-form">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          className="comment-input"
        />
        <button type="submit" className="comment-submit">
          Send
        </button>
      </form>
    </div>
  );
};

export default Comments; 