import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Ellipse


def add_box(ax, x, y, w, h, text, fc="#ffffff", ec="#000000", fs=9, weight="normal"):
    ax.add_patch(Rectangle((x, y), w, h, facecolor=fc, edgecolor=ec, linewidth=1.3))
    ax.text(x + w / 2, y + h / 2, text, ha="center", va="center", fontsize=fs, color="#000000", weight=weight)


def add_arrow(ax, x1, y1, x2, y2, label=None, label_dx=0.0, label_dy=0.02, curve=0.0):
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
    fig, ax = plt.subplots(figsize=(15, 6.5))
    fig.patch.set_facecolor("white")
    ax.set_facecolor("white")
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")

    # Group backgrounds (light)
    ax.add_patch(Rectangle((0.04, 0.2), 0.25, 0.55, facecolor="#ffffff", edgecolor="#000000", linewidth=1.2))
    ax.text(0.165, 0.73, "Pond / Sensor Layer", ha="center", va="bottom", fontsize=10, color="#000000", weight="bold")

    ax.add_patch(Rectangle((0.56, 0.22), 0.39, 0.50, facecolor="#ffffff", edgecolor="#000000", linewidth=1.2))
    ax.text(0.755, 0.70, "Raspberry Pi Server", ha="center", va="bottom", fontsize=10, color="#000000", weight="bold")

    # Field layer nodes
    add_box(ax, 0.06, 0.60, 0.11, 0.10, "Water Temp Sensor\n(DS18B20)", fc="#ffffff", fs=7.5)
    add_box(ax, 0.06, 0.44, 0.11, 0.10, "pH Sensor Probe", fc="#ffffff", fs=8)
    add_box(ax, 0.06, 0.28, 0.11, 0.10, "Dissolved Oxygen\nSensor Probe", fc="#ffffff", fs=7.5)
    add_box(ax, 0.20, 0.42, 0.07, 0.12, "ESP32\nController", fc="#ffffff", ec="#000000", weight="bold", fs=8)

    # Network node
    add_box(ax, 0.31, 0.42, 0.10, 0.12, "Wi-Fi Network", fc="#ffffff", ec="#000000")

    # User node
    add_box(ax, 0.56, 0.78, 0.15, 0.10, "User\n(Laptop / Mobile\nBrowser)", fc="#ffffff", ec="#000000")

    # Server nodes
    add_box(ax, 0.58, 0.42, 0.12, 0.14, "Express API (:4000)", fc="#ffffff")
    add_box(ax, 0.82, 0.48, 0.12, 0.10, "React Frontend (:5173)", fc="#ffffff")
    ax.add_patch(Ellipse((0.88, 0.34), 0.14, 0.12, facecolor="#ffffff", edgecolor="#000000", linewidth=1.2))
    ax.text(0.88, 0.34, "PostgreSQL (bfar_db)", ha="center", va="center", fontsize=9, color="#000000")

    # Arrows
    add_arrow(ax, 0.17, 0.65, 0.20, 0.48)
    add_arrow(ax, 0.17, 0.49, 0.20, 0.48)
    add_arrow(ax, 0.17, 0.33, 0.20, 0.48)

    add_arrow(
        ax,
        0.27,
        0.48,
        0.31,
        0.48,
        "POST /api/monitoring\n(every 60s)",
        label_dx=0.0,
        label_dy=-0.06,
    )
    add_arrow(ax, 0.41, 0.48, 0.58, 0.48)

    add_arrow(ax, 0.71, 0.79, 0.78, 0.79)
    add_arrow(ax, 0.78, 0.79, 0.88, 0.58, curve=0.12)
    ax.text(
        0.80,
        0.82,
        "Open dashboard",
        ha="center",
        va="bottom",
        fontsize=8,
        color="#000000",
        bbox=dict(facecolor="white", edgecolor="none", pad=0.6),
    )
    add_arrow(ax, 0.82, 0.51, 0.70, 0.50, "GET/POST", label_dx=0.0, label_dy=0.03, curve=0.08)
    add_arrow(ax, 0.70, 0.54, 0.82, 0.54, "JSON", label_dx=0.0, label_dy=0.02, curve=-0.08)

    add_arrow(ax, 0.70, 0.45, 0.81, 0.36, "Read/Write", label_dx=0.0, label_dy=0.03, curve=-0.05)
    add_arrow(ax, 0.81, 0.32, 0.70, 0.43, "Results", label_dx=0.0, label_dy=-0.005, curve=0.05)

    plt.tight_layout()
    plt.savefig("data/plots/system_architecture_light.png", dpi=300, bbox_inches="tight", facecolor="white")
    plt.close(fig)


if __name__ == "__main__":
    main()
