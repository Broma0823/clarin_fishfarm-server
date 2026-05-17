import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Ellipse


def add_box(ax, x, y, w, h, text, fs=9, weight="normal"):
    ax.add_patch(Rectangle((x, y), w, h, facecolor="#ffffff", edgecolor="#000000", linewidth=1.3))
    ax.text(x + w / 2, y + h / 2, text, ha="center", va="center", fontsize=fs, color="#000000", weight=weight)


def add_arrow(ax, x1, y1, x2, y2, label=None, label_dx=0.0, label_dy=0.015, curve=0.0):
    ax.annotate(
        "",
        xy=(x2, y2),
        xytext=(x1, y1),
        arrowprops=dict(
            arrowstyle="->",
            color="#000000",
            lw=1.2,
            shrinkA=2,
            shrinkB=2,
            connectionstyle=f"arc3,rad={curve}",
        ),
    )
    if label:
        ax.text(
            (x1 + x2) / 2 + label_dx,
            (y1 + y2) / 2 + label_dy,
            label,
            ha="center",
            va="bottom",
            fontsize=8,
            color="#000000",
            bbox=dict(facecolor="white", edgecolor="none", pad=0.6),
        )


def main():
    fig, ax = plt.subplots(figsize=(8.3, 11.0))
    fig.patch.set_facecolor("white")
    ax.set_facecolor("white")
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")

    # USER (top)
    add_box(ax, 0.32, 0.91, 0.36, 0.06, "User (Laptop / Mobile Browser)", fs=9, weight="bold")

    # SERVER block (upper-middle)
    ax.add_patch(Rectangle((0.10, 0.56), 0.80, 0.29, facecolor="#ffffff", edgecolor="#000000", linewidth=1.2))
    ax.text(0.50, 0.84, "Raspberry Pi Server", ha="center", va="bottom", fontsize=10, color="#000000", weight="bold")

    add_box(ax, 0.16, 0.67, 0.28, 0.09, "Express API (:4000)", fs=9)
    add_box(ax, 0.56, 0.67, 0.28, 0.09, "React Frontend (:5173)", fs=9)
    ax.add_patch(Ellipse((0.50, 0.60), 0.34, 0.09, facecolor="#ffffff", edgecolor="#000000", linewidth=1.2))
    ax.text(0.50, 0.60, "PostgreSQL (bfar_db)", ha="center", va="center", fontsize=9, color="#000000")

    # NETWORK (middle)
    add_box(ax, 0.35, 0.46, 0.30, 0.06, "Wi-Fi Network", fs=9, weight="bold")

    # FIELD block (bottom)
    ax.add_patch(Rectangle((0.10, 0.10), 0.80, 0.29, facecolor="#ffffff", edgecolor="#000000", linewidth=1.2))
    ax.text(0.50, 0.38, "Pond / Sensor Layer", ha="center", va="bottom", fontsize=10, color="#000000", weight="bold")

    add_box(ax, 0.38, 0.24, 0.24, 0.07, "ESP32 Controller", fs=9, weight="bold")
    add_box(ax, 0.12, 0.15, 0.22, 0.07, "Water Temp Sensor\n(DS18B20)", fs=8)
    add_box(ax, 0.39, 0.15, 0.22, 0.07, "pH Sensor Probe", fs=8)
    add_box(ax, 0.66, 0.15, 0.22, 0.07, "Dissolved Oxygen\nSensor Probe", fs=8)

    # USER -> WEB
    add_arrow(ax, 0.50, 0.91, 0.70, 0.76, "Open dashboard", label_dx=0.03, label_dy=0.01, curve=-0.1)

    # WEB <-> API
    add_arrow(ax, 0.56, 0.715, 0.44, 0.715, "GET/POST", label_dy=0.02, curve=0.08)
    add_arrow(ax, 0.44, 0.69, 0.56, 0.69, "JSON", label_dy=-0.025, curve=-0.08)

    # API <-> DB
    add_arrow(ax, 0.30, 0.67, 0.42, 0.63, "Read/Write", label_dy=0.02, curve=-0.1)
    add_arrow(ax, 0.58, 0.57, 0.36, 0.66, "Results", label_dy=-0.02, curve=0.1)

    # API -> Network -> ESP
    add_arrow(ax, 0.30, 0.67, 0.50, 0.52, curve=-0.1)
    add_arrow(ax, 0.50, 0.46, 0.50, 0.31, "POST /api/monitoring (every 60s)", label_dx=0.17, label_dy=-0.005)

    # Sensors -> ESP
    add_arrow(ax, 0.23, 0.22, 0.43, 0.24)
    add_arrow(ax, 0.50, 0.22, 0.50, 0.24)
    add_arrow(ax, 0.77, 0.22, 0.57, 0.24)

    plt.tight_layout()
    plt.savefig("data/plots/system_architecture_vertical_monochrome.png", dpi=300, bbox_inches="tight", facecolor="white")
    plt.close(fig)


if __name__ == "__main__":
    main()
