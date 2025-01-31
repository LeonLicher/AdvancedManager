export interface Comment {
    comm: string;    // comment text
    dt: string;      // datetime
    prurl?: string;  // profile image URL (optional)
    ui: string;      // user id
    unm: string;     // username
  }
  
  export interface CommentsResponse {
    coc: number;     // comment count
    it: Comment[];   // items (comments)
  }
  
  export interface CreateCommentRequest {
    comm: string;
  }