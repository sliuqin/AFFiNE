import { style } from '@vanilla-extract/css';

export const container = style({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  padding: '12px',
  gap: '12px',
});

export const header = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

export const headerTitle = style({
  fontSize: '16px',
  fontWeight: '600',
});

export const commentItem = style({
  padding: '8px',
  border: '1px solid #e0e0e0',
  borderRadius: '4px',
  marginBottom: '8px',
});

export const replyItem = style({
  padding: '8px',
  border: '1px solid #f0f0f0',
  borderRadius: '4px',
  marginTop: '8px',
});

export const repliesContainer = style({
  marginLeft: '20px',
  paddingTop: '8px',
});
