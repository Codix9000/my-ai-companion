"use client";

import {
  CardTitle,
  CardDescription,
  CardHeader,
  CardContent,
  CardFooter,
  Card,
} from "@repo/ui/src/components/card";
import { Textarea } from "@repo/ui/src/components/textarea";
import { Button } from "@repo/ui/src/components/button";
import { ArrowLeft, ImagePlus, Upload, Video, X } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/src/components/form";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useRef, useState } from "react";
import { Label } from "@repo/ui/src/components/label";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";
import Image from "next/image";
import Spinner from "@repo/ui/src/components/spinner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@repo/ui/src/components/checkbox";
import { RadioGroup, RadioGroupItem } from "@repo/ui/src/components/radio";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/src/components/avatar";

const formSchema = z.object({
  caption: z.string().min(1, "Caption is required").max(500),
  isLocked: z.boolean(),
  isNSFW: z.boolean(),
  format: z.enum(["feed", "short"]),
});

interface PostFormProps {
  characterId: Id<"characters">;
}

export default function PostForm({ characterId }: PostFormProps) {
  const { t } = useTranslation();
  const router = useRouter();

  // Fetch character info
  const character = useQuery(api.characters.get, { id: characterId });

  // Mutations
  const generateUploadUrl = useMutation(api.feed.generateUploadUrl);
  const createPost = useMutation(api.feed.createPost);

  // State
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const mediaInput = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      caption: "",
      isLocked: false,
      isNSFW: false,
      format: "feed",
    },
  });

  const handleMediaSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validImageTypes = ["image/gif", "image/jpeg", "image/png", "image/webp"];
    const validVideoTypes = ["video/mp4", "video/webm", "video/quicktime"];
    const isImage = validImageTypes.includes(file.type);
    const isVideo = validVideoTypes.includes(file.type);

    if (!isImage && !isVideo) {
      toast.error("Invalid file type. Please upload an image (gif, jpeg, png, webp) or video (mp4, webm).");
      return;
    }

    // Validate file size (50MB for video, 10MB for image)
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`File size should be less than ${isVideo ? "50MB" : "10MB"}`);
      return;
    }

    setMediaFile(file);
    setMediaType(isImage ? "image" : "video");
    setMediaPreview(URL.createObjectURL(file));
  };

  const clearMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    if (mediaInput.current) {
      mediaInput.current.value = "";
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!mediaFile) {
      toast.error("Please upload an image or video");
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload media to Convex storage
      setIsUploading(true);
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": mediaFile.type },
        body: mediaFile,
      });
      const { storageId } = await result.json();
      setIsUploading(false);

      // Create the post
      await createPost({
        authorId: characterId,
        mediaStorageId: storageId,
        mediaType: mediaType,
        caption: values.caption,
        isLocked: values.isLocked,
        format: values.format,
        isNSFW: values.isNSFW,
      });

      toast.success("Post created successfully!");
      router.push("/feed");
    } catch (error) {
      console.error("Failed to create post:", error);
      toast.error("Failed to create post. Please try again.");
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  }

  if (!character) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <Card className="h-full w-full overflow-hidden rounded-b-none border-transparent shadow-none lg:border-border lg:shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/my">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            {t("Create Post")}
          </div>
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          {t("Create a new post for")}{" "}
          <Avatar className="h-6 w-6">
            <AvatarImage src={character.cardImageUrl || ""} />
            <AvatarFallback>{character.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="font-semibold">{character.name}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Media Upload */}
        <div className="my-4 flex w-full flex-col items-center justify-center gap-4">
          <Label
            htmlFor="media"
            className="relative flex h-[300px] w-full max-w-[400px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed duration-200 hover:border-primary hover:bg-muted/50"
          >
            {mediaPreview ? (
              <>
                {mediaType === "image" ? (
                  <Image
                    src={mediaPreview}
                    alt="Preview"
                    fill
                    className="rounded-lg object-cover"
                  />
                ) : (
                  <video
                    src={mediaPreview}
                    className="h-full w-full rounded-lg object-cover"
                    controls
                    muted
                  />
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute right-2 top-2 h-8 w-8 rounded-full"
                  onClick={(e) => {
                    e.preventDefault();
                    clearMedia();
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <div className="flex gap-4">
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <ImagePlus className="h-8 w-8" />
                    <span className="text-xs">{t("Image")}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <Video className="h-8 w-8" />
                    <span className="text-xs">{t("Video")}</span>
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center text-center">
                  <span className="font-medium">{t("Click to upload media")}</span>
                  <span className="text-xs text-muted-foreground">
                    {t("Images: PNG, JPG, GIF, WebP (max 10MB)")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("Videos: MP4, WebM (max 50MB)")}
                  </span>
                </div>
              </>
            )}
          </Label>
          <input
            id="media"
            type="file"
            accept="image/*,video/*"
            ref={mediaInput}
            onChange={handleMediaSelect}
            className="hidden"
          />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Caption */}
            <FormField
              control={form.control}
              name="caption"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Caption")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("Write a caption for your post...")}
                      className="min-h-[100px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {field.value.length}/500 {t("characters")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Post Format */}
            <FormField
              control={form.control}
              name="format"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Post Type")}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="feed" id="feed" />
                        <Label htmlFor="feed" className="font-normal">
                          {t("Feed Post")}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="short" id="short" />
                        <Label htmlFor="short" className="font-normal">
                          {t("Short/Reel")}
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormDescription>
                    {t("Shorts appear in the vertical video feed")}
                  </FormDescription>
                </FormItem>
              )}
            />

            {/* Paywall Toggle */}
            <FormField
              control={form.control}
              name="isLocked"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>{t("Premium Content (Paywall)")}</FormLabel>
                    <FormDescription>
                      {t("Only subscribers can view this content")}
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* NSFW Toggle */}
            <FormField
              control={form.control}
              name="isNSFW"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>{t("Mature Content (18+)")}</FormLabel>
                    <FormDescription>
                      {t("This post contains adult content")}
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !mediaFile}
            >
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  {isUploading ? t("Uploading...") : t("Creating post...")}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {t("Create Post")}
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="pb-32" />
    </Card>
  );
}
