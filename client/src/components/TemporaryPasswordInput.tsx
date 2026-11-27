import { CopyIcon, RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { copyToClipboard } from "@/lib/clipboard";

// No look-alike characters (0/O, 1/l/I), so the password can be read aloud or retyped
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
const LENGTH = 12;

export function generateTemporaryPassword(): string {
  const bytes = crypto.getRandomValues(new Uint32Array(LENGTH));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  testIdPrefix: string;
};

/** Temporary password field with "generate" and "copy to clipboard" buttons. */
export function TemporaryPasswordInput({ id, value, onChange, testIdPrefix }: Props) {
  const handleCopy = async () => {
    try {
      await copyToClipboard(value);
      toast.success("Temporary password copied");
    } catch {
      toast.error("Could not copy; select the password and copy it manually");
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        id={id}
        data-testid={`${testIdPrefix}-input`}
        type="text"
        autoComplete="off"
        spellCheck={false}
        minLength={8}
        className="font-mono"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        title="Generate password"
        aria-label="Generate password"
        data-testid={`${testIdPrefix}-generate`}
        onClick={() => onChange(generateTemporaryPassword())}
      >
        <RefreshCwIcon className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        title="Copy to clipboard"
        aria-label="Copy to clipboard"
        data-testid={`${testIdPrefix}-copy`}
        disabled={!value}
        onClick={handleCopy}
      >
        <CopyIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}
