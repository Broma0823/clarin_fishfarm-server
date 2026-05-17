from datetime import datetime

import matplotlib.dates as mdates
import matplotlib.pyplot as plt


def build_times():
    labels = [
        "1:30 PM",
        "1:40 PM",
        "1:50 PM",
        "2:00 PM",
        "2:10 PM",
        "2:20 PM",
        "2:30 PM",
        "2:40 PM",
        "2:50 PM",
        "3:00 PM",
        "3:10 PM",
        "3:20 PM",
        "3:30 PM",
        "3:40 PM",
        "3:50 PM",
        "4:00 PM",
        "4:10 PM",
        "4:20 PM",
        "4:30 PM",
        "4:40 PM",
        "4:50 PM",
        "5:00 PM",
        "5:10 PM",
        "5:20 PM",
        "5:30 PM",
        "5:40 PM",
        "5:50 PM",
        "6:00 PM",
        "6:10 PM",
        "6:20 PM",
        "6:30 PM",
        "6:40 PM",
        "6:50 PM",
        "7:00 PM",
    ]
    return [datetime.strptime(value, "%I:%M %p") for value in labels]


def main():
    times = build_times()

    # System sensor readings only (no reference meter values).
    temperature_sensor = [
        33,
        33,
        33.25,
        33,
        33,
        33,
        33.5,
        33.5,
        33.25,
        33.25,
        33.25,
        33.25,
        33,
        33,
        32.75,
        33,
        33,
        33,
        33,
        33,
        33,
        33,
        33,
        32.75,
        32.75,
        32.5,
        32.5,
        32.5,
        32.25,
        32.25,
        32.25,
        32.25,
        32,
        32,
    ]

    ph_sensor = [
        8.71,
        8.76,
        9.84,
        8.88,
        9.09,
        8.64,
        9.02,
        9.52,
        9.32,
        9.25,
        10.07,
        9.25,
        8.36,
        8.15,
        9.13,
        8.44,
        8.46,
        7.97,
        7.44,
        8.89,
        8.65,
        8.75,
        9.18,
        8.51,
        8.89,
        8.53,
        7.99,
        8.33,
        8.23,
        7.77,
        8.78,
        7.87,
        7.89,
        7.68,
    ]

    do_sensor = [
        7.22,
        8.08,
        7.66,
        8.29,
        7.56,
        10.13,
        9.11,
        8.59,
        10.13,
        9.77,
        10.03,
        9.23,
        9.14,
        8.57,
        8.07,
        8.98,
        8.29,
        8.14,
        8.33,
        7.97,
        7.80,
        7.50,
        7.15,
        6.78,
        6.47,
        6.26,
        6.33,
        6.33,
        6.07,
        5.96,
        5.75,
        5.70,
        5.47,
        5.51,
    ]

    fig, axes = plt.subplots(3, 1, figsize=(12, 12), sharex=True)

    # Temperature plot with required range band.
    axes[0].plot(times, temperature_sensor, color="orange", marker="o", ms=4, lw=1.8, label="Temp Sensor")
    axes[0].axhspan(27, 30, color="orange", alpha=0.12, label="Required range (27-30 C)")
    axes[0].set_ylabel("Temperature (C)")
    axes[0].set_title("Water Temperature Sensor vs Time")
    axes[0].grid(True, alpha=0.25)
    axes[0].legend(loc="upper right")

    # pH plot with required range band.
    axes[1].plot(times, ph_sensor, color="green", marker="o", ms=4, lw=1.8, label="pH Sensor")
    axes[1].axhspan(6.5, 8.5, color="green", alpha=0.12, label="Required range (pH 6.5-8.5)")
    axes[1].set_ylabel("pH")
    axes[1].set_title("pH Sensor vs Time")
    axes[1].grid(True, alpha=0.25)
    axes[1].legend(loc="upper right")

    # DO plot with minimum required threshold.
    axes[2].plot(times, do_sensor, color="blue", marker="o", ms=4, lw=1.8, label="DO Sensor")
    axes[2].axhline(5.0, color="red", ls="--", lw=1.4, label="Required minimum (>= 5 mg/L)")
    axes[2].set_ylabel("DO (mg/L)")
    axes[2].set_title("Dissolved Oxygen Sensor vs Time")
    axes[2].grid(True, alpha=0.25)
    axes[2].legend(loc="upper right")

    axes[2].set_xlabel("Time")
    axes[2].xaxis.set_major_formatter(mdates.DateFormatter("%I:%M %p"))
    plt.setp(axes[2].get_xticklabels(), rotation=45, ha="right")

    plt.tight_layout()
    plt.savefig("docs/figures/system_sensor_trends_with_required_values.png", dpi=300, bbox_inches="tight")
    plt.close(fig)

    # Also save separate figures in case you need individual inserts.
    individual_specs = [
        (
            "docs/figures/temperature_sensor_vs_time.png",
            "Water Temperature Sensor vs Time",
            temperature_sensor,
            "orange",
            "Temperature (C)",
            (27, 30, "Required range (27-30 C)"),
            None,
        ),
        (
            "docs/figures/ph_sensor_vs_time.png",
            "pH Sensor vs Time",
            ph_sensor,
            "green",
            "pH",
            (6.5, 8.5, "Required range (pH 6.5-8.5)"),
            None,
        ),
        (
            "docs/figures/do_sensor_vs_time.png",
            "Dissolved Oxygen Sensor vs Time",
            do_sensor,
            "blue",
            "DO (mg/L)",
            None,
            (5.0, "Required minimum (>= 5 mg/L)"),
        ),
    ]

    for output, title, data, color, ylabel, band, line in individual_specs:
        fig_single, ax = plt.subplots(figsize=(11, 4.5))
        ax.plot(times, data, color=color, marker="o", ms=4, lw=1.8, label=title.replace(" vs Time", ""))
        if band:
            low, high, label = band
            ax.axhspan(low, high, color=color, alpha=0.12, label=label)
        if line:
            value, label = line
            ax.axhline(value, color="red", ls="--", lw=1.4, label=label)
        ax.set_title(title)
        ax.set_ylabel(ylabel)
        ax.set_xlabel("Time")
        ax.grid(True, alpha=0.25)
        ax.legend(loc="upper right")
        ax.xaxis.set_major_formatter(mdates.DateFormatter("%I:%M %p"))
        plt.setp(ax.get_xticklabels(), rotation=45, ha="right")
        plt.tight_layout()
        plt.savefig(output, dpi=300, bbox_inches="tight")
        plt.close(fig_single)


if __name__ == "__main__":
    main()
