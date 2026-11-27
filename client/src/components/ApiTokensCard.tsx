import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { CopyIcon, KeyRoundIcon, PlusIcon, TrashIcon } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { copyToClipboard } from "@/lib/clipboard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/** Project API tokens for the Playwright reporter: create (shown once), list, revoke. */
export function ApiTokensCard({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const { data: tokens, isLoading } = trpc.apiTokens.list.useQuery({ projectId });
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [newToken, setNewToken] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<{ id: string; name: string } | null>(null);

  const createToken = trpc.apiTokens.create.useMutation({
    onSuccess: ({ token }) => {
      setNewToken(token);
      setName("");
      utils.apiTokens.list.invalidate({ projectId });
    },
    onError: (error) => toast.error(error.message),
  });
  const revokeToken = trpc.apiTokens.revoke.useMutation({
    onSuccess: () => {
      toast.success("Token revoked");
      setRevokeTarget(null);
      utils.apiTokens.list.invalidate({ projectId });
    },
    onError: (error) => toast.error(error.message),
  });

  const closeCreate = () => {
    setCreateOpen(false);
    setNewToken(null);
    setName("");
  };

  const handleCopy = async (value: string) => {
    try {
      await copyToClipboard(value);
      toast.success("Token copied");
    } catch {
      toast.error("Could not copy; select the token and copy it manually");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <KeyRoundIcon className="h-5 w-5" />
              API Tokens
            </CardTitle>
            <CardDescription>
              The reporter must send one of this project's tokens. Create one per pipeline so you can revoke it on its own.
            </CardDescription>
          </div>
          <Button onClick={() => setCreateOpen(true)} data-testid="api-token-create">
            <PlusIcon className="h-4 w-4 mr-2" />
            New token
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Loading tokens...</p>
        ) : tokens && tokens.length > 0 ? (
          <Table data-testid="api-tokens-table">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Token</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map((token) => (
                <TableRow key={token.id} data-testid={`api-token-row-${token.name}`}>
                  <TableCell className="font-medium">{token.name}</TableCell>
                  <TableCell className="font-mono text-sm">{token.tokenPrefix}…</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {token.createdAt ? formatDistanceToNow(new Date(token.createdAt), { addSuffix: true }) : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground" data-testid="api-token-last-used">
                    {token.lastUsedAt ? formatDistanceToNow(new Date(token.lastUsedAt), { addSuffix: true }) : "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRevokeTarget({ id: token.id, name: token.name })}
                      data-testid="api-token-revoke"
                    >
                      <TrashIcon className="h-4 w-4 mr-1 text-destructive" />
                      Revoke
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground" data-testid="api-tokens-empty">
            No tokens yet. Reports are rejected until you create one.
          </p>
        )}
      </CardContent>

      <Dialog open={createOpen} onOpenChange={(open) => (open ? setCreateOpen(true) : closeCreate())}>
        <DialogContent>
          {newToken ? (
            <>
              <DialogHeader>
                <DialogTitle>Copy your new token</DialogTitle>
                <DialogDescription>
                  This is the only time it is shown. Store it as a secret in your CI, e.g. <code>QUALITYLOOM_TOKEN</code>.
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-2 py-2">
                <Input readOnly value={newToken} className="font-mono text-sm" data-testid="api-token-value" />
                <Button
                  variant="outline"
                  size="icon"
                  title="Copy to clipboard"
                  aria-label="Copy to clipboard"
                  onClick={() => handleCopy(newToken)}
                  data-testid="api-token-copy"
                >
                  <CopyIcon className="h-4 w-4" />
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={closeCreate} data-testid="api-token-done">Done</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>New API token</DialogTitle>
                <DialogDescription>Name it after where it will be used, e.g. "GitHub Actions nightly".</DialogDescription>
              </DialogHeader>
              <form
                id="create-token-form"
                className="space-y-2 py-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  createToken.mutate({ projectId, name });
                }}
              >
                <Label htmlFor="api-token-name">Name</Label>
                <Input
                  id="api-token-name"
                  data-testid="api-token-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </form>
              <DialogFooter>
                <Button variant="outline" onClick={closeCreate}>Cancel</Button>
                <Button type="submit" form="create-token-form" disabled={createToken.isPending} data-testid="api-token-submit">
                  Create token
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke "{revokeTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Reporters using this token are rejected immediately. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokeTarget && revokeToken.mutate({ id: revokeTarget.id, projectId })}
              data-testid="api-token-revoke-confirm"
            >
              Revoke token
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
