"use client";

import { useEffect, useRef, useState } from "react";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { FileVideo, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { firebaseStorage } from "@/lib/firebase/client";
import { cn } from "@/lib/utils";

/**
 * Player de video do Firebase Storage.
 *
 * O caminho salvo no Firestore e so o `path` (ex: "scripts/abc/x.mp4") —
 * pedir a URL de download e um passo a mais, exigido pelo Storage, e por
 * isso roda no cliente (a mesma sessao autenticada que fez o upload).
 */
export function StorageVideo({
  path,
  className,
}: {
  path: string;
  className?: string;
}) {
  const [resolved, setResolved] = useState<{
    path: string;
    url: string | null;
    error: boolean;
  }>({ path: "", url: null, error: false });

  useEffect(() => {
    let cancelled = false;
    getDownloadURL(storageRef(firebaseStorage(), path))
      .then((u) => {
        if (!cancelled) setResolved({ path, url: u, error: false });
      })
      .catch(() => {
        if (!cancelled) setResolved({ path, url: null, error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  const loading = resolved.path !== path;
  const url = loading ? null : resolved.url;
  const error = loading ? false : resolved.error;

  if (error) {
    return (
      <p className="text-xs text-muted-foreground">
        Não foi possível carregar o vídeo.
      </p>
    );
  }

  if (!url) {
    return (
      <div className={cn("flex h-40 items-center justify-center rounded-lg border border-border/60 bg-card/40", className)}>
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <video
      src={url}
      controls
      preload="metadata"
      className={cn("w-full rounded-lg border border-border/60 bg-black", className)}
    />
  );
}

/**
 * Campo de upload de video: mostra o preview quando ja existe um arquivo,
 * ou um botao de enviar quando nao existe. `pathPrefix` decide a pasta no
 * Storage (regras ja restringem quem pode escrever em cada uma).
 */
export function VideoUploadField({
  path,
  pathPrefix,
  onChange,
  disabled,
  label = "Vídeo de referência",
}: {
  path: string | null;
  pathPrefix: string;
  onChange: (path: string | null) => void;
  disabled?: boolean;
  label?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const dest = `${pathPrefix}/${Date.now()}-${file.name}`;
      await uploadBytes(storageRef(firebaseStorage(), dest), file);
      onChange(dest);
      toast.success("Vídeo enviado.");
    } catch {
      toast.error("Upload falhou. Confira sua permissão.");
    } finally {
      setUploading(false);
    }
  }

  if (path) {
    return (
      <div className="space-y-2">
        <StorageVideo path={path} className="max-h-64" />
        {!disabled && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onChange(null)}
            className="gap-1.5 text-muted-foreground"
          >
            <X className="size-3.5" />
            Remover vídeo
          </Button>
        )}
      </div>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading || disabled}
        onClick={() => inputRef.current?.click()}
        className="gap-1.5"
      >
        {uploading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Upload className="size-3.5" />
        )}
        {uploading ? "Enviando..." : label}
      </Button>
      {disabled && (
        <p className="mt-1 text-xs text-muted-foreground">
          <FileVideo className="mr-1 inline size-3" />
          Salve antes de anexar o vídeo.
        </p>
      )}
    </div>
  );
}
