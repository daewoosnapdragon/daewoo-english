'use client';

import StoryProfileModal from './StoryProfileModal';

interface StoryProfilePanelProps {
  resourceId: string;
  resourceText: string;
  onClose: () => void;
}

export default function StoryProfilePanel({ resourceId, onClose }: StoryProfilePanelProps) {
  return <StoryProfileModal resourceId={resourceId} onClose={onClose} />;
}
