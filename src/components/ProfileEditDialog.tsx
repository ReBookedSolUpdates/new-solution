import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { User, Mail, Loader2, Camera, X } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ActivityService } from "@/services/activityService";

interface ProfileEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileEditDialog = ({ isOpen, onClose }: ProfileEditDialogProps) => {
  const { user, profile, refreshProfile } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [profilePictureUrl, setProfilePictureUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && profile) {
      setFirstName((profile as any)?.first_name || "");
      setLastName((profile as any)?.last_name || "");
      setEmail(profile.email || user?.email || "");
      setProfilePictureUrl(profile.profile_picture_url || "");
    }
  }, [isOpen, profile, user]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be less than 2MB");
      return;
    }

    try {
      setIsUploading(true);
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("user-profiles")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("user-profiles")
        .getPublicUrl(filePath);

      setProfilePictureUrl(publicUrl);
      toast.success("Picture uploaded! Save changes to apply.");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const removePicture = () => {
    setProfilePictureUrl("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Please enter your first and last name");
      return;
    }

    if (!user?.id) {
      toast.error("User not authenticated");
      return;
    }

    setIsLoading(true);

    try {
      // Only update the name, not the email
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          profile_picture_url: profilePictureUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) {
        toast.error("Failed to update profile");
        return;
      }

      toast.success("Profile updated successfully!");

      // Log profile update activity
      try {
        await ActivityService.logProfileUpdate(user.id);
      } catch (activityError) {
      }

      // Refresh profile in context instead of reloading page
      await refreshProfile();
      onClose();
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
      setFirstName((profile as any)?.first_name || "");
      setLastName((profile as any)?.last_name || "");
      // Email is read-only, no need to reset it
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[90vw] max-w-[90vw] sm:max-w-md mx-auto my-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <User className="h-5 w-5 text-book-600 mr-2" />
            Edit Profile
          </DialogTitle>
        </DialogHeader>

        <form id="profile-edit-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Picture Upload */}
          <div className="flex flex-col items-center space-y-3">
            <div className="relative">
              <Avatar className="h-24 w-24 border-2 border-book-100">
                <AvatarImage src={profilePictureUrl} className="object-cover" />
                <AvatarFallback className="bg-book-50 text-book-600 text-xl font-bold">
                  {firstName?.[0]}{lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="picture-upload"
                className="absolute bottom-0 right-0 bg-book-600 text-white p-1.5 rounded-full cursor-pointer hover:bg-book-700 transition-colors shadow-lg"
              >
                <Camera className="h-4 w-4" />
                <input
                  id="picture-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploading || isLoading}
                />
              </label>
              {profilePictureUrl && (
                <button
                  type="button"
                  onClick={removePicture}
                  className="absolute -top-1 -right-1 bg-white text-gray-400 p-1 rounded-full border border-gray-200 hover:text-red-500 transition-colors shadow-sm"
                  title="Remove picture"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900">Profile Picture</p>
              <p className="text-xs text-gray-500">JPG, PNG or GIF (max 2MB)</p>
            </div>
            {isUploading && (
              <div className="flex items-center text-xs text-book-600 animate-pulse">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Uploading...
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Label htmlFor="first_name" className="text-sm font-medium">
              First Name
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="first_name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="pl-10"
                placeholder="Enter your first name"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="last_name" className="text-sm font-medium">
              Last Name
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="last_name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="pl-10"
                placeholder="Enter your last name"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-sm font-medium text-gray-600"
            >
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                value={email}
                className="pl-10 bg-gray-100 text-gray-600 cursor-not-allowed"
                placeholder="Email cannot be changed"
                disabled={true}
                readOnly={true}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              For security reasons, email addresses cannot be changed. Contact
              support if you need to update your email.
            </p>
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="profile-edit-form"
            disabled={isLoading}
            className="bg-book-600 hover:bg-book-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileEditDialog;
