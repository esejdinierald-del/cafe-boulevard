import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, X, Trash2 } from "lucide-react";

export interface SongRequest {
  id: string;
  table_number: string;
  youtube_url: string;
  video_id: string;
  title: string;
  thumbnail: string;
  status: string;
  created_at: string;
}

interface Props {
  songRequests: SongRequest[];
  playlist: SongRequest[];
  hasCurrentSong: boolean;
  radioMode: boolean;
  handleApproveSong: (id: string) => void;
  handleRejectSong: (id: string) => void;
  handleClearQueue?: () => void;
}

export function SongsPanel({
  songRequests, playlist, hasCurrentSong, radioMode, handleApproveSong, handleRejectSong, handleClearQueue,
}: Props) {
  const pending = songRequests.filter((s) => s.status === "pending");
  return (
    <div className="space-y-4">
      {!hasCurrentSong && !radioMode && (
        <Card className="p-8 text-center bg-card/50">
          <p className="text-4xl mb-3">🎵</p>
          <p className="font-bold">Nuk ka këngë në radhë</p>
          <p className="text-xs text-muted-foreground mt-1">Mirato kërkesat për të filluar muzikën</p>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="p-4">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <span>⏳ Kërkesat në Pritje</span>
            <Badge variant="outline">{pending.length}</Badge>
          </h2>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {pending.length === 0 ? (
              <p className="text-muted-foreground text-center py-6 text-sm">Nuk ka kërkesa në pritje ✨</p>
            ) : (
              pending.map((req) => (
                <Card key={req.id} className="p-3 bg-card/50 border-l-4 border-l-warning">
                  <div className="flex items-center gap-3">
                    <img src={req.thumbnail} alt={req.title} className="w-20 h-14 object-cover rounded-md flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{req.title}</p>
                      <p className="text-xs text-muted-foreground">Tavolina {req.table_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(req.created_at).toLocaleTimeString("sq-AL", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" onClick={() => handleApproveSong(req.id)} className="bg-success hover:bg-success/90 h-10 w-10 p-0">
                        <CheckCircle className="h-5 w-5" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleRejectSong(req.id)} className="h-10 w-10 p-0">
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <span>📋 Radha e Miratuar</span>
            <Badge variant="outline">{playlist.length}</Badge>
            {handleClearQueue && playlist.length > 0 && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleClearQueue}
                className="ml-auto h-8 gap-1"
              >
                <Trash2 className="h-4 w-4" />
                Pastro
              </Button>
            )}
          </h2>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {playlist.length === 0 ? (
              <p className="text-muted-foreground text-center py-6 text-sm">Radha është bosh</p>
            ) : (
              playlist.map((song) => (
                <Card key={song.id} className="p-3 bg-card/50 border-l-4 border-l-primary">
                  <div className="flex items-center gap-3">
                    <img src={song.thumbnail} alt={song.title} className="w-20 h-14 object-cover rounded-md flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{song.title}</p>
                      <p className="text-xs text-muted-foreground">Tav. {song.table_number}</p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}