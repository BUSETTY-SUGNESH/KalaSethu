'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useUIStore } from '@/lib/stores/ui-store';
import {
  getCommunity,
  updateCommunity,
  createChannel,
  subscribeToChannels,
} from '@/lib/services/community-messaging-service';
import type { Community, CommunityChannel } from '@/app/types';

export default function CommunitySettingsPage() {
  const params = useParams();
  const router = useRouter();
  const communityId = params.communityId as string;
  const { user } = useAuthStore();
  const { addToast } = useUIStore();

  const [community, setCommunity] = useState<Community | null>(null);
  const [channels, setChannels] = useState<CommunityChannel[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void getCommunity(communityId).then((c) => {
      if (c) {
        setCommunity(c);
        setName(c.name);
        setDescription(c.description || '');
        if (user && c.ownerId !== user.id) {
          router.replace(`/dashboard/communities`);
        }
      }
    });
    return subscribeToChannels(communityId, setChannels);
  }, [communityId, user, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateCommunity(communityId, { name, description });
      addToast({ type: 'success', title: 'Community updated' });
    } catch {
      addToast({ type: 'error', title: 'Update failed' });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateChannel(e: React.FormEvent) {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    try {
      await createChannel(communityId, newChannelName.trim());
      setNewChannelName('');
      addToast({ type: 'success', title: 'Channel created' });
    } catch {
      addToast({ type: 'error', title: 'Failed to create channel' });
    }
  }

  if (!community) {
    return <div className="container p-32">Loading...</div>;
  }

  return (
    <div className="container" style={{ padding: '32px var(--margin-desktop)', maxWidth: 720 }}>
      <h1 className="text-display-sm text-primary mb-24">Community Settings</h1>

      <form onSubmit={handleSave} className="flex flex-col gap-16 mb-32">
        <label className="flex flex-col gap-8">
          <span className="text-label-md">Name</span>
          <input className="chat-input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="flex flex-col gap-8">
          <span className="text-label-md">Description</span>
          <textarea
            className="chat-input"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <button type="submit" className="btn-primary" disabled={isSaving} style={{ alignSelf: 'flex-start' }}>
          Save changes
        </button>
      </form>

      <h2 className="text-headline-sm mb-16">Channels</h2>
      <ul className="mb-24">
        {channels.map((ch) => (
          <li key={ch.id} className="text-body-md py-8">
            #{ch.name}
            {ch.isAnnouncements && <span className="text-caption ml-8">(announcements)</span>}
          </li>
        ))}
      </ul>

      <form onSubmit={handleCreateChannel} className="flex gap-12">
        <input
          className="chat-input flex-1"
          placeholder="new-channel-name"
          value={newChannelName}
          onChange={(e) => setNewChannelName(e.target.value)}
        />
        <button type="submit" className="btn-primary">Add channel</button>
      </form>
    </div>
  );
}
