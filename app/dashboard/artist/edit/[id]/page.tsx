'use client';

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useUIStore } from "@/lib/stores/ui-store";
import {
  getArtworkForArtistEdit,
  updateArtistArtwork,
} from "@/lib/services/artwork-service";
import { uploadMultipleFiles, validateImageFile } from "@/lib/firebase/storage";
import type { Artwork, ArtworkImage } from "@/app/types";
import { ARTWORK_CATEGORIES } from "@/lib/constants/artwork-categories";

function parseDimensions(dimensions: string) {
  const match = dimensions.match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)(?:x(\d+(?:\.\d+)?))?\s*(in|cm)?$/i);
  if (!match) {
    return { width: "", height: "", depth: "", unit: "cm" };
  }
  return {
    width: match[1],
    height: match[2],
    depth: match[3] || "",
    unit: match[4]?.toLowerCase() || "cm",
  };
}

function formatDimensions(dim: {
  width: string;
  height: string;
  depth: string;
  unit: string;
}): string {
  if (dim.width && dim.height) {
    return `${dim.width}x${dim.height}${dim.depth ? `x${dim.depth}` : ""} ${dim.unit}`;
  }
  return "Not specified";
}

export default function ArtworkEditPage() {
  const router = useRouter();
  const params = useParams();
  const artworkId = params.id as string;
  const { user, isArtist } = useAuthStore();
  const { addToast } = useUIStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [artworkStatus, setArtworkStatus] = useState<string>("");
  const [isReadOnly, setIsReadOnly] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("paintings");
  const [medium, setMedium] = useState("");
  const [dimensions, setDimensions] = useState({ width: "", height: "", depth: "", unit: "cm" });
  const [creationYear, setCreationYear] = useState("");
  const [existingImages, setExistingImages] = useState<ArtworkImage[]>([]);
  const [removedImagePaths, setRemovedImagePaths] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user || !artworkId) return;

    if (!isArtist()) {
      router.push("/dashboard");
      return;
    }

    const artistId = user.id;

    async function loadArtwork() {
      setIsLoading(true);
      try {
        const data = await getArtworkForArtistEdit(artworkId, artistId);
        if (!data) {
          addToast({
            type: "error",
            title: "Access Denied",
            message: "This artwork does not exist or you do not have permission to edit it.",
          });
          router.push("/dashboard/artist");
          return;
        }

        setArtworkStatus(data.status);
        setTitle(data.title);
        setDescription(data.description);
        setPrice(String(data.price));
        setCategory(data.category);
        setMedium(data.medium === "Not specified" ? "" : data.medium);
        setDimensions(parseDimensions(data.dimensions));
        setCreationYear(data.year ? String(data.year) : "");
        setExistingImages(data.images || []);
        setTags(data.tags || []);

        if (data.status === "sold") {
          setIsReadOnly(true);
        }
      } catch (error) {
        console.error("Failed to load artwork", error);
        addToast({ type: "error", title: "Error", message: "Failed to load artwork." });
        router.push("/dashboard/artist");
      } finally {
        setIsLoading(false);
      }
    }

    loadArtwork();
  }, [user, artworkId, router, addToast, isArtist]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const newFileList = Array.from(e.target.files);
    const validFiles: File[] = [];
    const maxNew = 5 - existingImages.length;

    for (const file of newFileList) {
      const validationError = validateImageFile(file);
      if (validationError) {
        addToast({ type: "error", title: "Invalid Image", message: `${file.name}: ${validationError}` });
      } else {
        validFiles.push(file);
      }
    }

    setNewFiles((prev) => [...prev, ...validFiles].slice(0, maxNew));
  }

  function handleAddTag(e: React.KeyboardEvent) {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput("");
    }
  }

  function removeTag(tagToRemove: string) {
    setTags(tags.filter((t) => t !== tagToRemove));
  }

  function removeExistingImage(index: number) {
    const img = existingImages[index];
    if (img.storagePath) {
      setRemovedImagePaths((prev) => [...prev, img.storagePath]);
    }
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || isReadOnly) return;

    const totalImages = existingImages.length + newFiles.length;
    if (totalImages === 0) {
      addToast({ type: "error", title: "Missing Images", message: "Please keep at least one image." });
      return;
    }

    setIsSubmitting(true);

    try {
      let uploadedImages: ArtworkImage[] = [];
      if (newFiles.length > 0) {
        const uploaded = await uploadMultipleFiles(newFiles, `artworks/${user.id}/${artworkId}`);
        uploadedImages = uploaded.map((image, index) => ({
          id: image.fileName,
          url: image.downloadURL,
          thumbnailUrl: image.downloadURL,
          storagePath: image.fullPath,
          isPrimary: existingImages.length === 0 && index === 0,
          order: existingImages.length + index,
        }));
      }

      const mergedImages: ArtworkImage[] = [...existingImages, ...uploadedImages].map((img, index) => ({
        ...img,
        isPrimary: index === 0,
        order: index,
      }));

      await updateArtistArtwork(
        artworkId,
        user.id,
        {
          title,
          description,
          price: Number(price),
          category,
          medium: medium || "Not specified",
          year: creationYear ? Number(creationYear) : new Date().getFullYear(),
          tags: tags.length > 0 ? tags : [],
          dimensions: formatDimensions(dimensions),
          images: mergedImages,
        },
        { removedImagePaths }
      );

      addToast({
        type: "success",
        title: "Artwork Updated",
        message: "Your changes have been saved.",
      });
      router.push("/dashboard/artist");
    } catch (error) {
      console.error("Update error", error);
      addToast({
        type: "error",
        title: "Update Failed",
        message: "There was a problem saving your changes.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="container" style={{ paddingTop: 32, paddingBottom: 80 }}>
        <div className="skeleton" style={{ width: "40%", height: 40, marginBottom: 16 }} />
        <div className="skeleton" style={{ width: "60%", height: 24, marginBottom: 48 }} />
        <div className="skeleton" style={{ height: 400, borderRadius: "var(--radius-lg)" }} />
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 80 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 32 }}>
        <div>
          <Link
            href="/dashboard/artist"
            className="text-label-md text-on-surface-variant flex items-center gap-4"
            style={{ marginBottom: 8, display: "inline-flex" }}
          >
            <Icon name="arrow_back" size={16} />
            Back to Studio
          </Link>
          <h1 className="text-display-sm text-primary">Edit Artwork</h1>
          <p className="text-body-lg text-on-surface-variant">
            Update your artwork details and images.
            {artworkStatus && (
              <span className="capitalize" style={{ marginLeft: 8 }}>
                Status: <strong>{artworkStatus}</strong>
              </span>
            )}
          </p>
        </div>
      </div>

      {isReadOnly && (
        <div
          className="bg-surface-container-low"
          style={{
            padding: 16,
            borderRadius: "var(--radius-md)",
            marginBottom: 24,
            border: "1px solid rgba(196, 199, 199, 0.2)",
          }}
        >
          <p className="text-body-md text-on-surface-variant">
            This artwork has been sold and can no longer be edited.
          </p>
          <Link href="/dashboard/artist">
            <Button variant="outline" style={{ marginTop: 12 }}>
              Back to Studio
            </Button>
          </Link>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 48, opacity: isReadOnly ? 0.6 : 1 }}
      >
        <div className="flex flex-col gap-32">
          <div
            className="bg-surface-container-lowest"
            style={{ padding: 32, borderRadius: "var(--radius-lg)", border: "1px solid rgba(196, 199, 199, 0.2)" }}
          >
            <h2 className="text-headline-sm text-primary" style={{ marginBottom: 24 }}>
              Basic Information
            </h2>

            <div className="flex flex-col gap-24">
              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., The Silent Ascetic"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={isReadOnly}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  placeholder="Tell the story behind this piece..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  disabled={isReadOnly}
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={isReadOnly}
                  >
                    {ARTWORK_CATEGORIES.map((cat) => (
                      <option key={cat.slug} value={cat.slug}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Price (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="0.00"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                    disabled={isReadOnly}
                  />
                </div>
              </div>
            </div>
          </div>

          <div
            className="bg-surface-container-lowest"
            style={{ padding: 32, borderRadius: "var(--radius-lg)", border: "1px solid rgba(196, 199, 199, 0.2)" }}
          >
            <h2 className="text-headline-sm text-primary" style={{ marginBottom: 24 }}>
              Physical Properties
            </h2>

            <div className="flex flex-col gap-24">
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Medium/Material</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., Bronze, Natural Colors on Silk"
                    value={medium}
                    onChange={(e) => setMedium(e.target.value)}
                    disabled={isReadOnly}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Creation Year (Optional)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="e.g., 2023"
                    value={creationYear}
                    onChange={(e) => setCreationYear(e.target.value)}
                    disabled={isReadOnly}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Dimensions</label>
                <div className="grid-4">
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Width"
                    value={dimensions.width}
                    onChange={(e) => setDimensions({ ...dimensions, width: e.target.value })}
                    disabled={isReadOnly}
                  />
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Height"
                    value={dimensions.height}
                    onChange={(e) => setDimensions({ ...dimensions, height: e.target.value })}
                    disabled={isReadOnly}
                  />
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Depth (Opt)"
                    value={dimensions.depth}
                    onChange={(e) => setDimensions({ ...dimensions, depth: e.target.value })}
                    disabled={isReadOnly}
                  />
                  <select
                    className="form-select"
                    value={dimensions.unit}
                    onChange={(e) => setDimensions({ ...dimensions, unit: e.target.value })}
                    disabled={isReadOnly}
                  >
                    <option value="in">Inches</option>
                    <option value="cm">Centimeters</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-32">
          <div
            className="bg-surface-container-lowest"
            style={{ padding: 32, borderRadius: "var(--radius-lg)", border: "1px solid rgba(196, 199, 199, 0.2)" }}
          >
            <h2 className="text-headline-sm text-primary" style={{ marginBottom: 24 }}>
              Media
            </h2>

            {!isReadOnly && existingImages.length + newFiles.length < 5 && (
              <div className="dropzone" onClick={() => fileInputRef.current?.click()}>
                <Icon name="cloud_upload" size={48} className="text-primary mb-16" />
                <p className="text-body-md text-on-surface-variant">
                  Click to upload or drag and drop images
                  <br />
                  <span className="text-caption">JPG, PNG, WEBP, AVIF (Max 10MB each)</span>
                </p>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                />
              </div>
            )}

            {(existingImages.length > 0 || newFiles.length > 0) && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 24 }}>
                {existingImages.map((img, idx) => (
                  <div
                    key={img.id || img.url}
                    style={{
                      position: "relative",
                      aspectRatio: "1",
                      borderRadius: "var(--radius-md)",
                      overflow: "hidden",
                      border: "1px solid rgba(196, 199, 199, 0.2)",
                    }}
                  >
                    <img
                      src={img.thumbnailUrl || img.url}
                      alt={`Artwork ${idx + 1}`}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    {idx === 0 && (
                      <span
                        style={{
                          position: "absolute",
                          bottom: 8,
                          left: 8,
                          background: "rgba(0,0,0,0.6)",
                          color: "white",
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: 4,
                        }}
                      >
                        Primary
                      </span>
                    )}
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => removeExistingImage(idx)}
                        style={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          background: "rgba(0,0,0,0.5)",
                          color: "white",
                          border: "none",
                          borderRadius: "50%",
                          width: 24,
                          height: 24,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                      >
                        <Icon name="close" size={16} />
                      </button>
                    )}
                  </div>
                ))}
                {newFiles.map((file, idx) => (
                  <div
                    key={`new-${idx}`}
                    style={{
                      position: "relative",
                      aspectRatio: "1",
                      borderRadius: "var(--radius-md)",
                      overflow: "hidden",
                      border: "1px solid rgba(196, 199, 199, 0.2)",
                    }}
                  >
                    <img
                      src={URL.createObjectURL(file)}
                      alt="Preview"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    <button
                      type="button"
                      onClick={() => setNewFiles(newFiles.filter((_, i) => i !== idx))}
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        background: "rgba(0,0,0,0.5)",
                        color: "white",
                        border: "none",
                        borderRadius: "50%",
                        width: 24,
                        height: 24,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      <Icon name="close" size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            className="bg-surface-container-lowest"
            style={{ padding: 32, borderRadius: "var(--radius-lg)", border: "1px solid rgba(196, 199, 199, 0.2)" }}
          >
            <h2 className="text-headline-sm text-primary" style={{ marginBottom: 24 }}>
              Tags
            </h2>

            <div className="form-group">
              <input
                type="text"
                className="form-input"
                placeholder="Type tag and press Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                disabled={isReadOnly}
              />
            </div>

            {tags.length > 0 && (
              <div className="tag-list" style={{ marginTop: 16 }}>
                {tags.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                    {!isReadOnly && (
                      <button type="button" className="tag-remove" onClick={() => removeTag(tag)}>
                        <Icon name="close" size={14} />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-16">
            {!isReadOnly && (
              <Button variant="primary" size="lg" fullWidth type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            )}
            <Button variant="outline" size="lg" fullWidth type="button" onClick={() => router.push("/dashboard/artist")}>
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
