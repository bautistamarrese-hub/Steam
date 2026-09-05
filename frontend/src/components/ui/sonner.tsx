import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="bottom-right"
      richColors
      visibleToasts={4}
      gap={12}
      className="toaster group"
      toastOptions={{
        duration: 4500,
        classNames: {
          toast:
            "group toast !rounded-xl !border !border-border/80 !bg-card/95 !px-5 !py-4 !text-foreground !shadow-2xl !shadow-black/35 backdrop-blur-md",
          title: "!text-sm !font-semibold !leading-5",
          description: "!mt-1 !text-sm !leading-5 group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
