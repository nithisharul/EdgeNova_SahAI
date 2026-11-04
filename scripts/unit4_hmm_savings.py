"""Unit 4: a two-state Hidden Markov Model for monthly savings deposits.

States are hidden (regular or irregular saver); observations are visible
(deposit or no deposit). The NumPy-only implementation includes scaled forward
and backward passes, posterior state probabilities, Viterbi decoding, and
Baum-Welch parameter estimation. It can also read the app's SQLite ledger.

Run from the project root:
    python scripts/unit4_hmm_savings.py
    python scripts/unit4_hmm_savings.py --db backend/database.db
"""

import argparse
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
EPSILON = 1e-12


def _normalize(values, axis=None):
    totals = values.sum(axis=axis, keepdims=True)
    return values / np.maximum(totals, EPSILON)


def forward(obs, pi, transition, emission):
    """Scaled forward probabilities and per-time scaling factors."""
    obs = np.asarray(obs, dtype=int)
    if obs.ndim != 1 or len(obs) == 0:
        raise ValueError("An observation sequence must be a nonempty 1D array")
    if np.any((obs < 0) | (obs >= emission.shape[1])):
        raise ValueError("Observation symbol outside emission matrix")

    alpha = np.zeros((len(obs), len(pi)))
    scales = np.zeros(len(obs))
    alpha[0] = pi * emission[:, obs[0]]
    scales[0] = max(alpha[0].sum(), EPSILON)
    alpha[0] /= scales[0]
    for t in range(1, len(obs)):
        alpha[t] = (alpha[t - 1] @ transition) * emission[:, obs[t]]
        scales[t] = max(alpha[t].sum(), EPSILON)
        alpha[t] /= scales[t]
    return alpha, scales


def backward(obs, transition, emission, scales):
    obs = np.asarray(obs, dtype=int)
    beta = np.ones((len(obs), transition.shape[0]))
    for t in range(len(obs) - 2, -1, -1):
        beta[t] = transition @ (emission[:, obs[t + 1]] * beta[t + 1])
        beta[t] /= max(scales[t + 1], EPSILON)
    return beta


def posterior(obs, pi, transition, emission):
    alpha, scales = forward(obs, pi, transition, emission)
    beta = backward(obs, transition, emission, scales)
    return _normalize(alpha * beta, axis=1)


def viterbi(obs, pi, transition, emission):
    obs = np.asarray(obs, dtype=int)
    log_pi = np.log(np.maximum(pi, EPSILON))
    log_transition = np.log(np.maximum(transition, EPSILON))
    log_emission = np.log(np.maximum(emission, EPSILON))
    score = np.zeros((len(obs), len(pi)))
    backpointer = np.zeros((len(obs), len(pi)), dtype=int)
    score[0] = log_pi + log_emission[:, obs[0]]
    for t in range(1, len(obs)):
        candidates = score[t - 1][:, None] + log_transition
        backpointer[t] = candidates.argmax(axis=0)
        score[t] = candidates.max(axis=0) + log_emission[:, obs[t]]
    path = np.zeros(len(obs), dtype=int)
    path[-1] = score[-1].argmax()
    for t in range(len(obs) - 2, -1, -1):
        path[t] = backpointer[t + 1, path[t + 1]]
    return path


def baum_welch(sequences, pi, transition, emission, iterations=50, smoothing=1e-6):
    """Estimate HMM parameters by EM; smoothing avoids zero-probability rows."""
    sequences = [np.asarray(seq, dtype=int) for seq in sequences if len(seq)]
    if not sequences:
        raise ValueError("At least one nonempty training sequence is required")
    pi, transition, emission = pi.copy(), transition.copy(), emission.copy()
    states, symbols = emission.shape

    for _ in range(iterations):
        pi_count = np.full(states, smoothing)
        transition_count = np.full((states, states), smoothing)
        emission_count = np.full((states, symbols), smoothing)

        for obs in sequences:
            alpha, scales = forward(obs, pi, transition, emission)
            beta = backward(obs, transition, emission, scales)
            gamma = _normalize(alpha * beta, axis=1)
            pi_count += gamma[0]
            for t in range(len(obs) - 1):
                xi = alpha[t, :, None] * transition * (
                    emission[:, obs[t + 1]] * beta[t + 1]
                )[None, :]
                transition_count += _normalize(xi)
            for symbol in range(symbols):
                emission_count[:, symbol] += gamma[obs == symbol].sum(axis=0)

        pi = _normalize(pi_count)
        transition = _normalize(transition_count, axis=1)
        emission = _normalize(emission_count, axis=1)
    return pi, transition, emission


def hmm_log_likelihood(sequences, pi, transition, emission):
    return sum(np.log(forward(seq, pi, transition, emission)[1]).sum()
               for seq in sequences if len(seq))


def markov_fit(sequences, smoothing=1.0):
    initial = np.full(2, smoothing)
    counts = np.full((2, 2), smoothing)
    for obs in sequences:
        if len(obs):
            initial[obs[0]] += 1
            for before, after in zip(obs[:-1], obs[1:]):
                counts[before, after] += 1
    return _normalize(initial), _normalize(counts, axis=1)


def markov_log_likelihood(sequences, initial, transition):
    total = 0.0
    for obs in sequences:
        if len(obs):
            total += np.log(initial[obs[0]])
            total += sum(np.log(transition[a, b]) for a, b in zip(obs[:-1], obs[1:]))
    return float(total)


def monthly_sequences(db_path, min_months=6):
    """Build member deposit/no-deposit sequences using calendar months."""
    with sqlite3.connect(db_path) as connection:
        rows = connection.execute(
            "SELECT member_id, timestamp FROM ledger "
            "WHERE entry_type='savings_deposit' ORDER BY timestamp"
        ).fetchall()

    by_member = {}
    for member_id, timestamp in rows:
        month_date = datetime.fromtimestamp(float(timestamp), timezone.utc)
        month_index = month_date.year * 12 + month_date.month
        by_member.setdefault(member_id, []).append(month_index)

    result = {}
    for member_id, months in by_member.items():
        first, last = min(months), max(months)
        if last - first + 1 < min_months:
            continue
        sequence = np.zeros(last - first + 1, dtype=int)
        sequence[np.unique(np.asarray(months) - first)] = 1
        result[member_id] = sequence
    return result


def synthetic_sequences(count=80, length=24, seed=3):
    rng = np.random.default_rng(seed)
    sequences = []
    for _ in range(count):
        state = int(rng.random() < 0.4)
        observations = []
        for _ in range(length):
            deposit_probability = 0.92 if state == 0 else 0.45
            observations.append(int(rng.random() < deposit_probability))
            if rng.random() >= 0.9:
                state = 1 - state
        sequences.append(np.asarray(observations, dtype=int))
    return sequences


def main():
    parser = argparse.ArgumentParser(description="Fit an HMM to savings sequences.")
    parser.add_argument("--db", type=Path, default=None,
                        help="SQLite database containing the ledger table")
    parser.add_argument("--iterations", type=int, default=50)
    args = parser.parse_args()
    if args.iterations < 1:
        parser.error("--iterations must be at least 1")

    if args.db:
        if not args.db.is_file():
            parser.error(f"database not found: {args.db}")
        named = monthly_sequences(args.db)
        names = list(named)
        sequences = list(named.values())
        if len(sequences) < 2:
            parser.error("need at least two members with six or more ledger months")
    else:
        sequences = synthetic_sequences()
        names = [f"synthetic_{index}" for index in range(len(sequences))]

    split = max(1, min(len(sequences) - 1, int(0.8 * len(sequences))))
    train, test = sequences[:split], sequences[split:]
    pi0 = np.array([0.6, 0.4])
    transition0 = np.array([[0.9, 0.1], [0.3, 0.7]])
    emission0 = np.array([[0.1, 0.9], [0.6, 0.4]])
    pi, transition, emission = baum_welch(
        train, pi0, transition0, emission0, iterations=args.iterations
    )
    markov_initial, markov_transition = markov_fit(train)
    print(f"Member sequences: {len(sequences)} (train {len(train)}, held-out {len(test)})")
    print("Learned initial state probabilities:", np.round(pi, 3).tolist())
    print("Learned transition matrix:\n", np.round(transition, 3))
    print("P(deposit | hidden state):", np.round(emission[:, 1], 3).tolist())
    print("Held-out log-likelihood:")
    print(f"  HMM: {hmm_log_likelihood(test, pi, transition, emission):.2f}")
    print(f"  Observable Markov chain: {markov_log_likelihood(test, markov_initial, markov_transition):.2f}")

    regular_state = int(np.argmax(emission[:, 1]))
    for name, obs in list(zip(names, sequences))[:5]:
        probabilities = posterior(obs, pi, transition, emission)
        states = viterbi(obs, pi, transition, emission)
        print(f"{name}: P(regular in final month)={probabilities[-1, regular_state]:.3f}; "
              f"Viterbi final states={states[-6:].tolist()}")


if __name__ == "__main__":
    main()
