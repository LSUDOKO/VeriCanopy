const CARDS: [string, string, string][] = [
  ["Self-reported baselines", "Most forest credits rest on a developer-chosen counterfactual. Nobody re-derives it from pixels.", "Up to 90% of some rainforest offsets were found to be phantom reductions in independent audits."],
  ["Nothing watches after issuance", "A credit minted in 2021 says nothing about the fire in 2023. Registries do not re-score the forest.", "1.2 MtCO2e of loss detected on one VeriCanopy pilot area in a single fire year."],
  ["Scores you cannot check", "Ratings agencies publish a number and ask for trust. No proof the model ran, no proof on which data.", "4,416-byte Halo2 proof: the number is right, or the transaction reverts."],
];

export function Problem() {
  return (
    <section className="section" style={{ background: "var(--fog)" }}>
      <div className="wrap">
        <div className="reveal max-w-2xl">
          <div className="eyebrow" style={{ color: "var(--teal)" }}>The problem</div>
          <h2 className="display mt-3 text-4xl sm:text-5xl">The market trusts paperwork. The forest does not read it.</h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {CARDS.map(([t, d, n], i) => (
            <div key={t} className="reveal card flex flex-col p-7">
              <div className="mono text-sm" style={{ color: "var(--fg-muted)" }}>0{i + 1}</div>
              <h3 className="display mt-6 text-2xl">{t}</h3>
              <p className="mt-3 text-[15px]" style={{ color: "var(--fg-muted)" }}>{d}</p>
              <p className="mt-auto pt-8 text-sm font-medium" style={{ color: "var(--forest)" }}>{n}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
