import matplotlib.pyplot as plt


def plot_event_counts(event_counts, player_id, day_number):
    """Creates and displays pie charts of event points, separating positive and negative points."""
    if not event_counts:
        print("No event points to plot.")
        return

    # Separate positive/zero and negative points
    positive_labels = []
    positive_points = []
    negative_labels = []
    negative_points = []

    for label, points in event_counts.items():
        if points >= 0:
            positive_labels.append(label)
            positive_points.append(points)
        else:
            negative_labels.append(label)
            # Use absolute value for pie chart
            negative_points.append(abs(points))

    # Plot positive/zero points pie chart
    plt.figure(figsize=(10, 10))
    plt.pie(positive_points, labels=positive_labels, autopct='%1.1f%%',
            startangle=140, colors=plt.cm.Paired.colors)
    plt.title(
        f"Positive/Zero Event Points for Player {player_id} on Day {day_number}")
    plt.axis('equal')
    plt.tight_layout()
    plt.show()

    # Plot negative points pie chart
    if negative_points:
        plt.figure(figsize=(10, 10))
        plt.pie(negative_points, labels=negative_labels, autopct='%1.1f%%',
                startangle=140, colors=plt.cm.Paired.colors)
        plt.title(
            f"Negative Event Points for Player {player_id} on Day {day_number}")
        plt.axis('equal')
        plt.tight_layout()
        plt.show()
