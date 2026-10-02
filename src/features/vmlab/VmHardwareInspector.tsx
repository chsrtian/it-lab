import { X } from "lucide-react";
import { VM_PROFILE } from "./vmProfile";

export interface VmHardwareInspectorProps {
  onClose: () => void;
}

/**
 * Virtual Hardware / Machine inspector (Phase 14B-2) — a secondary equipment
 * panel rendered as a reserved grid column next to the machine, never over
 * the VM screen. All facts come from `vmProfile.ts`; runtime state is not
 * shown here (it lives in the machine header badge). Static content: the
 * panel adds no listeners, timers or polling — when closed it does not
 * exist at all.
 */
export function VmHardwareInspector({ onClose }: VmHardwareInspectorProps) {
  const { guest, boot, hardware } = VM_PROFILE;

  return (
    <aside
      id="vm-hardware-panel"
      className="vm-inspector"
      aria-label="Virtual hardware"
      data-testid="vm-hardware-panel"
    >
      <div className="vm-inspector__head">
        <h2 className="vm-inspector__title">Virtual hardware</h2>
        <button
          type="button"
          className="vm-inspector__close"
          aria-label="Close virtual hardware panel"
          onClick={onClose}
        >
          <X size={14} aria-hidden />
        </button>
      </div>

      <p className="vm-inspector__intro">
        A virtual machine is a computer recreated in software. IT Lab runs this machine inside your
        browser so you can practice without changing the operating system on your real computer.
      </p>

      <dl className="vm-inspector__list">
        {hardware.map((item) => (
          <div className="vm-inspector__item" key={item.id} data-hardware={item.id}>
            <dt>{item.label}</dt>
            <dd>
              <span className="vm-inspector__value">{item.value}</span>
              <span className="vm-inspector__detail">{item.detail}</span>
            </dd>
          </div>
        ))}
      </dl>

      <section className="vm-inspector__block" aria-label="Boot configuration">
        <h3 className="vm-inspector__label t-mono">BOOT ORDER</h3>
        <p className="vm-inspector__value">{boot.order.join(" → ")}</p>
        <p className="vm-inspector__detail">{boot.note}</p>
      </section>

      <section className="vm-inspector__block" aria-label="Guest system">
        <h3 className="vm-inspector__label t-mono">GUEST SYSTEM</h3>
        <dl className="vm-inspector__guest">
          <div>
            <dt>Operating system</dt>
            <dd>{guest.os}</dd>
          </div>
          <div>
            <dt>Kernel</dt>
            <dd>{guest.kernel}</dd>
          </div>
          <div>
            <dt>Architecture</dt>
            <dd>{guest.arch}</dd>
          </div>
          <div>
            <dt>Shell</dt>
            <dd>{guest.shell}</dd>
          </div>
        </dl>
      </section>
    </aside>
  );
}
