import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";

interface ManusDialogProps {
  title?: string;
  logo?: string;
  open?: boolean;
  onLogin: () => void;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
}

export function ManusDialog({
  title,
  logo,
  open = false,
  onLogin,
  onOpenChange,
  onClose,
}: ManusDialogProps) {
  const [internalOpen, setInternalOpen] = useState(open);

  useEffect(() => {
    if (!onOpenChange) {
      setInternalOpen(open);
    }
  }, [open, onOpenChange]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(nextOpen);
    } else {
      setInternalOpen(nextOpen);
    }

    if (!nextOpen) {
      onClose?.();
    }
  };

  return (
    <Dialog
      open={onOpenChange ? open : internalOpen}
      onOpenChange={handleOpenChange}
    >
      <DialogContent className="py-5 bg-[#1a1814] rounded-[20px] w-[400px] shadow-[0px_8px_32px_0px_rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.08)] backdrop-blur-2xl p-0 gap-0 text-center">
        <div className="flex flex-col items-center gap-3 p-5 pt-12">
          {logo ? (
            <div className="w-16 h-16 bg-[#0f0e0c] rounded-xl border border-[rgba(255,255,255,0.08)] flex items-center justify-center">
              <img
                src={logo}
                alt="TotalLook.ai"
                className="w-10 h-10 rounded-md"
              />
            </div>
          ) : null}

          {/* Title and subtitle */}
          {title ? (
            <DialogTitle className="text-xl font-semibold text-[#f0ece4] leading-[26px] tracking-[-0.44px]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {title}
            </DialogTitle>
          ) : null}
          <DialogDescription className="text-sm text-[#9a9590] leading-5 tracking-[-0.154px]">
            התחבר כדי לקבל חוות דעת אופנתית מקצועית
          </DialogDescription>
        </div>

        <DialogFooter className="px-5 py-5">
          {/* Login button */}
          <Button
            onClick={onLogin}
            className="w-full h-10 bg-gradient-to-l from-[#FF2E9F] to-[#7B2EFF] hover:from-[#FF2E9F] hover:to-[#7B2EFF] text-black font-semibold rounded-[10px] text-sm leading-5 tracking-[-0.154px]"
          >
            התחבר ל-TotalLook.ai
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
