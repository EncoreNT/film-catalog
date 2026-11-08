"use client";

import type { ReactNode } from "react";
import { ArrowRightLeft, HardDriveDownload, X } from "lucide-react";
import { Button } from "@/components/primitives/Button";
import { NativeDialog } from "@/components/primitives/NativeDialog";
import "./release-transfer-dialog.css";

export type TransferDialogAccent = "accent" | "neural";
export interface TransferDialogFooterAction {
  label: string;
  variant: "ghost" | "secondary" | "primary";
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}
interface ReleaseTransferDialogProps {
  open: boolean;
  onClose: () => void;
  preventCancel?: boolean;
  accent?: TransferDialogAccent;
  eyebrow: string;
  title: string;
  titleId: string;
  statusMeta?: { label: string; badgeClass: string } | null;
  statusRunning?: boolean;
  children: ReactNode;
  footerActions: TransferDialogFooterAction[];
}
export function ReleaseTransferDialog({ open, onClose, preventCancel = false, accent = "accent",
  title, titleId, statusMeta, statusRunning = false, children, footerActions,
}: ReleaseTransferDialogProps) {
  const Icon = accent === "neural" ? ArrowRightLeft : HardDriveDownload;
  return (
    <NativeDialog open={open} onClose={onClose} preventCancel={preventCancel}
      zIndex={110} ariaLabelledBy={titleId} className="transfer-dialog">
      <header className="transfer-dialog-header">
        <Icon size={22} aria-hidden />
        <div>
          <h2 id={titleId}>{title}</h2>
          {statusMeta && <p role="status" className="transfer-dialog-status">
            {statusRunning ? "Выполняется в фоне" : statusMeta.label}
          </p>}
        </div>
        <Button type="button" variant="ghost" onClick={onClose} disabled={preventCancel} aria-label="Закрыть"
          className="transfer-dialog-close"><X size={20} aria-hidden /></Button>
      </header>
      <div className="transfer-dialog-body scroll-subtle">{children}</div>
      <footer className="transfer-dialog-footer">
        {footerActions.map((action) => <Button key={action.label} type="button" variant={action.variant}
          loading={action.loading} disabled={action.disabled} onClick={action.onClick}>{action.label}</Button>)}
      </footer>
    </NativeDialog>
  );
}
