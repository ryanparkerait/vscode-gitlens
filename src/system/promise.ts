'use strict';
import { CancellationToken } from 'vscode';

export namespace Promises {
	export class CancellationError<T> extends Error {
		constructor(public readonly promise: T, message: string) {
			super(message);
		}
	}

	export function cancellable<T>(
		promise: Thenable<T>,
		timeoutOrToken: number | CancellationToken,
		options: {
			cancelMessage?: string;
			onDidCancel?(
				resolve: (value?: T | PromiseLike<T> | undefined) => void,
				reject: (reason?: any) => void
			): void;
		} = {}
	): Promise<T> {
		return new Promise((resolve, reject) => {
			let fulfilled = false;
			let timer: NodeJS.Timer | undefined;
			if (typeof timeoutOrToken === 'number') {
				timer = setTimeout(() => {
					if (typeof options.onDidCancel === 'function') {
						options.onDidCancel(resolve, reject);
					} else {
						reject(new CancellationError(promise, options.cancelMessage || 'TIMED OUT'));
					}
				}, timeoutOrToken);
			} else {
				timeoutOrToken.onCancellationRequested(() => {
					if (fulfilled) return;

					if (typeof options.onDidCancel === 'function') {
						options.onDidCancel(resolve, reject);
					} else {
						reject(new CancellationError(promise, options.cancelMessage || 'CANCELLED'));
					}
				});
			}

			promise.then(
				() => {
					fulfilled = true;
					if (timer !== undefined) {
						clearTimeout(timer);
					}
					resolve(promise);
				},
				ex => {
					fulfilled = true;
					if (timer !== undefined) {
						clearTimeout(timer);
					}
					reject(ex);
				}
			);
		});
	}
	export function is<T>(obj: T | Promise<T>): obj is Promise<T> {
		return obj != null && typeof (obj as Promise<T>).then === 'function';
	}
}
