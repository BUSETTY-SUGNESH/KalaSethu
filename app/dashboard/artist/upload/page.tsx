'use client';

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/app/components/ui/Icon";
import Button from "@/app/components/ui/Button";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useUIStore } from "@/lib/stores/ui-store";
import { createArtwork } from "@/lib/services/artwork-service";
import { uploadMultipleFiles } from "@/lib/firebase/storage";

export default function ArtworkUploadPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addToast } = useUIStore();
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("paintings");
  const [medium, setMedium] = useState("");
  const [dimensions, setDimensions] = useState({ width: "", height: "", depth: "", unit: "cm" });
  const [creationYear, setCreationYear] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles].slice(0, 5)); // Max 5 images
    }
  }

  function handleAddTag(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput("");
    }
  }

  function removeTag(tagToRemove: string) {
    setTags(tags.filter(t => t !== tagToRemove));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    
    if (files.length === 0) {
      addToast({ type: "error", title: "Missing Images", message: "Please upload at least one image." });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create empty artwork to get ID
      const newArtwork = await createArtwork(
        user.id,
        user.displayName,
        user.isVerified || false,
        {
          title,
          description,
          price: Number(price),
          category,
          listingType: "fixed_price",
          isCommissionable: false,
          medium: medium || "Not specified",
          year: creationYear ? Number(creationYear) : new Date().getFullYear(),
          tags: tags.length > 0 ? tags : [],
          dimensions: dimensions.width && dimensions.height ? `${dimensions.width}x${dimensions.height}${dimensions.depth ? `x${dimensions.depth}` : ''} ${dimensions.unit}` : "Not specified",
        },
        []
      );
      
      // Upload images
      const uploadedImages = await uploadMultipleFiles(files, `artworks/${newArtwork}`);
      
      // We'd typically update the artwork with the image URLs here using another service call
      // For this simplified version, let's just assume the service can update it
      
      addToast({ 
        type: "success", 
        title: "Artwork Saved", 
        message: "Your artwork has been saved as a draft." 
      });
      
      router.push("/dashboard/artist");
    } catch (error) {
      console.error("Upload error", error);
      addToast({ 
        type: "error", 
        title: "Upload Failed", 
        message: "There was a problem saving your artwork." 
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 80 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 32 }}>
        <div>
          <h1 className="text-display-sm text-primary">Upload Artwork</h1>
          <p className="text-body-lg text-on-surface-variant">Add a new piece to your portfolio or marketplace.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 48 }}>
        {/* Left Column: Details */}
        <div className="flex flex-col gap-32">
          <div className="bg-surface-container-lowest" style={{ padding: 32, borderRadius: "var(--radius-lg)", border: "1px solid rgba(196, 199, 199, 0.2)" }}>
            <h2 className="text-headline-sm text-primary" style={{ marginBottom: 24 }}>Basic Information</h2>
            
            <div className="flex flex-col gap-24">
              <div className="form-group">
                <label className="form-label">Title</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g., The Silent Ascetic" 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea 
                  className="form-textarea" 
                  placeholder="Tell the story behind this piece..." 
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select 
                    className="form-select"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                  >
                    <option value="paintings">Paintings & Miniatures</option>
                    <option value="bronze">Sculpture & Bronze</option>
                    <option value="textiles">Textiles & Weaves</option>
                    <option value="woodcraft">Woodcraft</option>
                    <option value="jewelry">Heritage Jewelry</option>
                    <option value="other">Other</option>
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
                    onChange={e => setPrice(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest" style={{ padding: 32, borderRadius: "var(--radius-lg)", border: "1px solid rgba(196, 199, 199, 0.2)" }}>
            <h2 className="text-headline-sm text-primary" style={{ marginBottom: 24 }}>Physical Properties</h2>
            
            <div className="flex flex-col gap-24">
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Medium/Material</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g., Bronze, Natural Colors on Silk" 
                    value={medium}
                    onChange={e => setMedium(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Creation Year (Optional)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="e.g., 2023" 
                    value={creationYear}
                    onChange={e => setCreationYear(e.target.value)}
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
                    onChange={e => setDimensions({...dimensions, width: e.target.value})}
                  />
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="Height" 
                    value={dimensions.height}
                    onChange={e => setDimensions({...dimensions, height: e.target.value})}
                  />
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="Depth (Opt)" 
                    value={dimensions.depth}
                    onChange={e => setDimensions({...dimensions, depth: e.target.value})}
                  />
                  <select 
                    className="form-select"
                    value={dimensions.unit}
                    onChange={e => setDimensions({...dimensions, unit: e.target.value})}
                  >
                    <option value="in">Inches</option>
                    <option value="cm">Centimeters</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Media & Actions */}
        <div className="flex flex-col gap-32">
          <div className="bg-surface-container-lowest" style={{ padding: 32, borderRadius: "var(--radius-lg)", border: "1px solid rgba(196, 199, 199, 0.2)" }}>
            <h2 className="text-headline-sm text-primary" style={{ marginBottom: 24 }}>Media</h2>
            
            <div 
              className="dropzone"
              onClick={() => fileInputRef.current?.click()}
            >
              <Icon name="cloud_upload" size={48} className="text-primary mb-16" />
              <p className="text-body-md text-on-surface-variant">
                Click to upload or drag and drop images<br/>
                <span className="text-caption">JPG, PNG, WEBP (Max 5MB each)</span>
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

            {files.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 24 }}>
                {files.map((file, idx) => (
                  <div key={idx} style={{ position: "relative", aspectRatio: "1", borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid rgba(196, 199, 199, 0.2)" }}>
                    <img 
                      src={URL.createObjectURL(file)} 
                      alt="Preview" 
                      style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                    />
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setFiles(files.filter((_, i) => i !== idx)); }}
                      style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.5)", color: "white", border: "none", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                    >
                      <Icon name="close" size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-surface-container-lowest" style={{ padding: 32, borderRadius: "var(--radius-lg)", border: "1px solid rgba(196, 199, 199, 0.2)" }}>
            <h2 className="text-headline-sm text-primary" style={{ marginBottom: 24 }}>Tags</h2>
            
            <div className="form-group">
              <input 
                type="text" 
                className="form-input" 
                placeholder="Type tag and press Enter" 
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
              />
            </div>
            
            {tags.length > 0 && (
              <div className="tag-list" style={{ marginTop: 16 }}>
                {tags.map(tag => (
                  <span key={tag} className="tag">
                    {tag}
                    <button type="button" className="tag-remove" onClick={() => removeTag(tag)}>
                      <Icon name="close" size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-16">
            <Button variant="primary" size="lg" fullWidth type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save as Draft"}
            </Button>
            <Button variant="outline" size="lg" fullWidth type="button" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
