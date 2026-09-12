// Đã chuyển sang usePhvbViewport.ts (hỗ trợ nhiều tier: mobile/tablet/narrow).
// File này giữ lại làm re-export để call-site cũ không phải sửa.
export {
  LIBRARY_NARROW_BREAKPOINT_PX,
  usePhvbNarrowViewport
} from './usePhvbViewport';
