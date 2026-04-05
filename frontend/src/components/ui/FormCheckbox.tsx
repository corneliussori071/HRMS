import { InputHTMLAttributes, forwardRef } from "react";

interface FormCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

const FormCheckbox = forwardRef<HTMLInputElement, FormCheckboxProps>(
  ({ label, id, className = "", ...props }, ref) => {
    const checkboxId = id || label.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex items-center gap-2">
        <input
          ref={ref}
          id={checkboxId}
          type="checkbox"
          className={`h-4 w-4 rounded border border-border text-primary focus:ring-1 focus:ring-primary ${className}`}
          {...props}
        />
        <label htmlFor={checkboxId} className="text-sm text-foreground">
          {label}
        </label>
      </div>
    );
  }
);

FormCheckbox.displayName = "FormCheckbox";

export default FormCheckbox;
