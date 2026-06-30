"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/components/ui/Button";
import Icon from "@/app/components/ui/Icon";
import { createPost } from "@/lib/services/community-service";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useUIStore } from "@/lib/stores/ui-store";

const CATEGORIES = [
  "Techniques",
  "Provenance",
  "Conservation",
  "Marketplace",
  "Events",
  "General",
];

export default function NewDiscussionPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function addTag() {
    const tag = tagInput.trim();
    if (!tag || tags.includes(tag)) return;
    setTags([...tags, tag].slice(0, 6));
    setTagInput("");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isAuthenticated || !user) {
      router.push("/login?redirect=/dashboard/community/new");
      return;
    }

    setIsSubmitting(true);
    try {
      const postId = await createPost(
        user.id,
        user.displayName,
        user.avatarUrl,
        user.isVerified,
        {
          title: title.trim(),
          content: content.trim(),
          type: "discussion",
          category,
          tags: tags.length > 0 ? tags : [category],
          authorRole: user.role,
        }
      );

      addToast({
        type: "success",
        title: "Discussion Created",
        message: "Your topic is live in CharchaSabha.",
      });
      router.push(`/community/${postId}`);
    } catch (error) {
      console.error("Failed to create discussion", error);
      addToast({
        type: "error",
        title: "Could Not Create Discussion",
        message: "Please check your connection and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 80, maxWidth: 920 }}>
      <div className="flex items-center gap-12" style={{ marginBottom: 32 }}>
        <Icon name="forum" size={32} className="text-accent-terracotta" />
        <div>
          <h1 className="text-headline-lg text-primary">Start a Discussion</h1>
          <p className="text-body-md text-on-surface-variant">
            Ask a question, share a technique, or open a provenance conversation.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-surface-container-lowest flex flex-col gap-24" style={{ padding: 32, borderRadius: "var(--radius-lg)", border: "1px solid rgba(196, 199, 199, 0.2)" }}>
        <div className="form-group">
          <label className="form-label">Title</label>
          <input
            className="form-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What would you like to discuss?"
            required
            minLength={6}
            maxLength={160}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Category</label>
          <select className="form-select" value={category} onChange={(event) => setCategory(event.target.value)}>
            {CATEGORIES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Discussion</label>
          <textarea
            className="form-textarea"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Add context, references, and the specific help or perspective you are looking for."
            required
            minLength={20}
            rows={8}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Tags</label>
          <div className="flex gap-12">
            <input
              className="form-input"
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addTag();
                }
              }}
              placeholder="Add a tag and press Enter"
            />
            <Button type="button" variant="outline" onClick={addTag}>Add</Button>
          </div>
          {tags.length > 0 && (
            <div className="tag-list" style={{ marginTop: 12 }}>
              {tags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                  <button type="button" className="tag-remove" onClick={() => setTags(tags.filter((item) => item !== tag))}>
                    <Icon name="close" size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center" style={{ paddingTop: 16, borderTop: "1px solid rgba(196, 199, 199, 0.2)" }}>
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting || title.trim().length < 6 || content.trim().length < 20}>
            {isSubmitting ? "Posting..." : "Post Discussion"}
          </Button>
        </div>
      </form>
    </div>
  );
}
