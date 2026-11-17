// Parity helper: same corpus as the legacy JS harness; prints JSON.
use agent_14_guardrails_redteam::{app::SYSTEM, guards::*};
use serde_json::json;
fn main() {
    let inp: Vec<String> = serde_json::from_str(&std::fs::read_to_string("/tmp/in14.json").unwrap()).unwrap();
    let outs: Vec<String> = serde_json::from_str(&std::fs::read_to_string("/tmp/out14.json").unwrap()).unwrap();
    let o = json!({"i": inp.iter().map(|t| input_guard(t)).collect::<Vec<_>>(), "o": outs.iter().map(|t| output_guard(t, None, None)).collect::<Vec<_>>(),
        "o2": outs.iter().map(|t| output_guard(t, Some("CANARY-7f3a9c"), Some(SYSTEM))).collect::<Vec<_>>()});
    println!("{}", serde_json::to_string(&o).unwrap());
}
